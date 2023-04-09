import { ReactElementType } from 'shared/ReactType'
import { mountChildFibers, recocileChildFibers } from './childrenFibers'
import { FiberNode } from './fiber'
import { renderWithHooks } from './fiberHooks'
import { processUpdateQueue, UpdateQueue } from './updateQueue'
import { FuntionComponent, HostComponent, HostRoot, HostText } from './workTags'

export const beginWork = (wip: FiberNode) => {
  // 比较子fiberNode
  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip)
    case HostComponent:
      return updateHostComponent(wip)
    case HostText:
      return null
    case FuntionComponent:
      return updateFuntionComponent(wip)
    default:
      if (__DEV__) {
        console.warn('beginWork未实现的类型')
      }
      break
  }
  return null
}

function updateFuntionComponent(wip: FiberNode) {
  const nextChildren = renderWithHooks(wip)
  recocnileChildren(wip, nextChildren)

  return wip.child
}

function updateHostRoot(wip: FiberNode) {
  const baseState = wip.memoizedState
  const updateQueue = wip.updateQueue as UpdateQueue<Element>
  const pending = updateQueue.shared.pending
  updateQueue.shared.pending = null
  const { memoizedState } = processUpdateQueue(baseState, pending)
  wip.memoizedState = memoizedState

  const nextChildren = wip.memoizedState

  recocnileChildren(wip, nextChildren)
  return wip.child
}

function updateHostComponent(wip: FiberNode) {
  const nextProps = wip.pendingProps
  const nextChildren = nextProps.children
  recocnileChildren(wip, nextChildren)

  return wip.child
}

function recocnileChildren(wip: FiberNode, children?: ReactElementType) {
  const current = wip.alternate
  if (current) {
    // update
    wip.child = recocileChildFibers(wip, current?.child, children)
  } else {
    // mount
    wip.child = mountChildFibers(wip, null, children)
  }
}
