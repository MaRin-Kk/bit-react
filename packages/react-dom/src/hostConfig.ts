import { FiberNode } from 'react-reconciler/src/fiber'
import { HostText } from 'react-reconciler/src/workTags'
import { DOMElement, updateFiberProps } from './SyntheticEvent'
import { Props } from 'shared/ReactType'

export type Container = Element
export type Instance = Element
export type TextInstance = Text
// export const createInstance = (type: string, props: any): Instance => {
export const createInstance = (type: string, props: Props): Instance => {
  // TODO  处理props
  const element = document.createElement(type) as unknown

  updateFiberProps(element as DOMElement, props)

  return element as DOMElement
}

export const appentInitalChild = (parent: Instance | Container, child: Instance) => {
  parent.appendChild(child)
}

export const createTextInstance = (content: string) => {
  return document.createTextNode(content)
}

export const appendChildToContainer = appentInitalChild

export function commitUpdate(fiber: FiberNode) {
  switch (fiber.tag) {
    case HostText:
      const text = fiber.memoizedProps.content
      return commitTextUpdate(fiber.stateNode, text)
    default:
      if (__DEV__) {
        console.warn('未实现的update类型', fiber)
      }
      break
  }
}

export function commitTextUpdate(textInstance: TextInstance, content: string) {
  textInstance.textContent = content
}
export function removeChild(child: Instance | TextInstance, container: Container) {
  container.removeChild(child)
}

export const inserChildToContainer = (child: Instance, container: Container, before: Instance) => {
  container.insertBefore(child, before)
}
