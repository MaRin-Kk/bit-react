import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbiols'
import { Props, ReactElementType } from 'shared/ReactType'
import { creatFiberFromElement, creatWorkInProgress, FiberNode } from './fiber'
import { ChildDeletion, Placement } from './fiberFlags'
import { HostText } from './workTags'

function ChildReconciler(shoukdTrackEffects: boolean) {
  function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
    if (!shoukdTrackEffects) {
      return
    }
    const deletions = returnFiber.deletions
    if (deletions === null) {
      returnFiber.deletions = [childToDelete]
      returnFiber.flags |= ChildDeletion
    } else {
      deletions.push(childToDelete)
    }
  }

  function reconcileSingleElement(returnFiber: FiberNode, currentFiber: FiberNode | null, element: ReactElementType) {
    // 根据element 创建fiber 返回

    const key = element.key
    work: if (currentFiber !== null) {
      //update
      if (currentFiber.key === key) {
        //key相同
        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          if (currentFiber.type === element.type) {
            //type相同
            const existing = useFiber(currentFiber, element.props)
            existing.return = returnFiber
            return existing
          }
          //删掉旧的
          deleteChild(returnFiber, currentFiber)
          break work
        } else {
          if (__DEV__) {
            console.warn('还未实现的react类型', element)
            break work
          }
        }
      } else {
        deleteChild(returnFiber, currentFiber)
      }
    }
    const fiber = creatFiberFromElement(element)
    fiber.return = returnFiber
    return fiber
  }

  function reconcileTextNode(returnFiber: FiberNode, currentFiber: FiberNode | null, content: string | number) {
    // 根据element 创建fiber 返回
    if (currentFiber) {
      if (currentFiber.tag === HostText) {
        const existing = useFiber(currentFiber, { content })
        existing.return = returnFiber
        return existing
      }
      deleteChild(returnFiber, currentFiber)
    }
    const fiber = new FiberNode(HostText, { content }, null)
    fiber.return = returnFiber
    return fiber
  }

  // 插入单一的节点
  function placeSingleChild(fiber: FiberNode) {
    if (shoukdTrackEffects && fiber.alternate === null) {
      // 首屏渲染
      fiber.flags |= Placement
    }
    return fiber
  }

  return function recocileChildFibers(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild?: ReactElementType
  ) {
    // 判断fiber的类型
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(reconcileSingleElement(returnFiber, currentFiber, newChild))

        default:
          if (__DEV__) {
            console.warn('未实现的reconcile类型', newChild)
          }
          break
      }
    }

    // 多节点的情况 ul > li * 3

    // HostText
    if (typeof newChild === 'string' || typeof newChild === 'number') {
      return placeSingleChild(reconcileTextNode(returnFiber, currentFiber, newChild))
    }

    if (currentFiber) {
      deleteChild(returnFiber, currentFiber)
    }

    if (__DEV__) {
      console.warn('未实现的reconcile类型', newChild, shoukdTrackEffects)
    }
    return null
  }
}

export const recocileChildFibers = ChildReconciler(true)

export const mountChildFibers = ChildReconciler(false)

function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
  const clone = creatWorkInProgress(fiber, pendingProps)
  clone.index = 0
  clone.sibling = null
  return clone
}
