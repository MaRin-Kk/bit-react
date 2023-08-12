import { Dispatch, Dispatcher } from 'react/src/currentDispatcher'
import internals from 'shared/internals'
import { Action, Type } from 'shared/ReactType'
import { FiberNode } from './fiber'
import { createUpdate, createUpdateQueue, enqueueUpdate, processUpdateQueue, UpdateQueue } from './updateQueue'
import { scheduleUpdateOnFiber } from './workLoop'
import { Lane, NoLane, requestUpdateLane } from './fiberLans'
import { Flags, PassiveEffect } from './fiberFlags'
import { HookHasEffect, Passive } from './hooksEffectTags'

let currentlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null
let renderLane: Lane = NoLane
interface Hook {
  memoizedState: any
  updateQuque: unknown
  next: Hook | null
}

export interface Effect {
  tag: Flags
  create: EffectCallback | void
  destory: EffectCallback | void
  deps: EffectDeps
  next: Effect | null
}

// 函数组件的update
export interface FCUpdateQueue<State> extends UpdateQueue<State> {
  lastEffect: Effect | null
}
type EffectCallback = () => void
type EffectDeps = any[] | null

const { currentDispatcher } = internals

export function renderWithHooks(wip: FiberNode, lane: Lane) {
  // 赋值操作
  currentlyRenderingFiber = wip

  // 重置hooks链表
  wip.memoizedState = null

  // 重置effect链表
  wip.updateQueue = null

  renderLane = lane

  const current = wip.alternate
  if (current) {
    // update
    currentDispatcher.current = HookDispatcherOnUpdate
  } else {
    // mount
    currentDispatcher.current = HookDispatcherOnMount
  }
  const Component = wip.type
  const props = wip.pendingProps
  const children = Component(props)
  // 重置操作
  currentlyRenderingFiber = null
  workInProgressHook = null
  currentHook = null
  renderLane = NoLane
  return children
}

const HookDispatcherOnMount: Dispatcher = {
  useState: mountState,
  useEffect: mountEffect
}
const HookDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
  useEffect: updateEffecet
}

function mountEffect(create: EffectCallback | void, deps: EffectDeps | void) {
  // 找到当前useState 对应的hook数据
  const hook = mountWorkInProgressHook()
  const nextDeps = deps === undefined ? null : deps
  ;(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect
  hook.memoizedState = pushEffect(Passive | HookHasEffect, create, undefined, nextDeps)
}

function updateEffecet(create: EffectCallback | void, deps: EffectDeps | void) {
  // 找到当前useState 对应的hook数据
  const hook = updateWorkInProgressHook()
  const nextDeps = deps || null
  let destory: EffectCallback | void
  if (currentHook) {
    const prevEffect = currentHook.memoizedState as Effect
    destory = prevEffect.destory
    if (nextDeps) {
      // 浅比较
      if (areHookInputEqual(nextDeps, prevEffect.deps)) {
        hook.memoizedState = pushEffect(Passive, create, destory, nextDeps)
        return
      }
    }
    // 浅比较 不相等
    ;(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect
    hook.memoizedState = pushEffect(Passive | HookHasEffect, create, destory, nextDeps)
  }

  ;(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect
  hook.memoizedState = pushEffect(Passive | HookHasEffect, create, undefined, nextDeps)
}

function areHookInputEqual(nextDeps: EffectDeps, prevDeps: EffectDeps) {
  if (!nextDeps || !prevDeps) {
    return false
  }

  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (Object.is(prevDeps[i], nextDeps[i])) {
      continue
    }
    return false
  }
  return true
}

function pushEffect(
  hookFlags: Flags,
  create: EffectCallback | void,
  destory: EffectCallback | void,
  deps: EffectDeps
): Effect {
  const effect: Effect = {
    tag: hookFlags,
    create,
    destory,
    deps,
    next: null
  }
  const fiber = currentlyRenderingFiber as FiberNode
  const updateQueue = fiber.updateQueue as FCUpdateQueue<any>
  if (updateQueue === null) {
    const updateQueue = createFCUpdateQueue()
    fiber.updateQueue = updateQueue
    effect.next = effect
    updateQueue.lastEffect = effect
  } else {
    const lastEffect = updateQueue.lastEffect
    if (lastEffect === null) {
      effect.next = effect
      updateQueue.lastEffect = effect
    } else {
      const firstEffect = lastEffect.next
      lastEffect.next = effect
      effect.next = firstEffect
      updateQueue.lastEffect = effect
    }
  }
  return effect
}
function createFCUpdateQueue<State>() {
  const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>
  updateQueue.lastEffect = null
  return updateQueue
}
function mountState<State>(initialState: (() => State) | State): [State, Dispatch<State>] {
  // 找到当前useState 对应的hook数据
  const hook = mountWorkInProgressHook()
  let memoizedState
  if (initialState instanceof Function) {
    memoizedState = initialState()
  } else {
    memoizedState = initialState
  }
  const queue = createUpdateQueue<State>()
  hook.updateQuque = queue
  hook.memoizedState = memoizedState

  // @ts-ignore
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue)
  queue.dispatch = dispatch

  return [memoizedState, dispatch]
}

function updateState<State>(): [State, Dispatch<State>] {
  // 找到当前useState 对应的hook数据
  const hook = updateWorkInProgressHook()

  // 计算新state的逻辑
  const queue = hook.updateQuque as UpdateQueue<State>
  const pending = queue.shared.pending
  // lane模型，卡松老师放开了 但是我这边放开会有问题
  // queue.shared.pending = null

  if (pending !== null) {
    const { memoizedState } = processUpdateQueue(hook.memoizedState, pending, renderLane)
    hook.memoizedState = memoizedState
  }

  return [hook.memoizedState, queue.dispatch as Dispatch<State>]
}

function dispatchSetState<State>(fiber: FiberNode, updateQueue: UpdateQueue<State>, action: Action<State>) {
  const lane = requestUpdateLane()
  const update = createUpdate(action, lane)
  enqueueUpdate(updateQueue, update)
  scheduleUpdateOnFiber(fiber, lane)
}

function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    updateQuque: null,
    next: null
  }
  if (workInProgressHook === null) {
    // mount 时第一个hook
    if (currentlyRenderingFiber === null) {
      throw new Error('请在函数组件内部使用hook')
    } else {
      workInProgressHook = hook
      currentlyRenderingFiber.memoizedState = workInProgressHook
    }
  } else {
    // mount 后续的hook
    workInProgressHook.next = hook
    workInProgressHook = hook
  }
  return workInProgressHook
}

function updateWorkInProgressHook(): Hook {
  let nextCurrentHook: Hook | null

  // FC update时的第一个hook
  if (currentHook === null) {
    const current = currentlyRenderingFiber?.alternate
    if (current !== null) {
      nextCurrentHook = current?.memoizedState
    } else {
      nextCurrentHook = null
    }
  } else {
    // FC update时后续的hook
    nextCurrentHook = currentHook.next
  }

  if (nextCurrentHook === null) {
    throw new Error(`组件${currentlyRenderingFiber?.type}本次执行时比上次执行时多`)
  }

  currentHook = nextCurrentHook as Hook
  const newHook: Hook = {
    memoizedState: currentHook.memoizedState,
    updateQuque: currentHook.updateQuque,
    next: null
  }
  if (workInProgressHook === null) {
    // mount 时第一个hook
    if (currentlyRenderingFiber === null) {
      throw new Error('请在函数组件内部使用hook')
    } else {
      workInProgressHook = newHook
      currentlyRenderingFiber.memoizedState = workInProgressHook
    }
  } else {
    // mount 后续的hook
    workInProgressHook.next = newHook
    workInProgressHook = newHook
  }
  return workInProgressHook
}
