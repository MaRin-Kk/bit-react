import { Dispatch } from 'react/src/currentDispatcher'
import { Action } from 'shared/ReactType'
import { Update } from './fiberFlags'

export interface Update<State> {
  action: Action<State>
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null
  }
  dispatch: Dispatch<State> | null
}
export const createUpdate = <State>(action: Action<State>): Update<State> => {
  return {
    action
  }
}

export const createUpdateQueue = <Action>() => {
  return {
    shared: {
      pending: null
    },
    dispatch: null
  } as UpdateQueue<Action>
}

// 增加update
export const enqueueUpdate = <Action>(updateQueue: UpdateQueue<Action>, update: Update<Action>) => {
  updateQueue.shared.pending = update
}

// 正在消费的update
export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State> | null
): { memoizedState: State } => {
  const result: ReturnType<typeof processUpdateQueue<State>> = { memoizedState: baseState }
  if (pendingUpdate) {
    const action = pendingUpdate.action
    if (action instanceof Function) {
      result.memoizedState = action(baseState)
    } else {
      result.memoizedState = action
    }
  }

  return result
}
