import * as React from 'react'
import type { Doc, DrawStyles, State } from 'types'
import {
  TLPinchEventHandler,
  TLPointerEventHandler,
  TLWheelEventHandler,
  Utils,
  Vec,
} from '@tldraw/core'
import { StateManager } from './state-core'
import { Draw } from './shapes'
import type { StateSelector } from 'zustand'
import { pointInPolygon } from './utils'

export const shapeUtils = {
  draw: new Draw(),
}

export const initialDoc: Doc = {
  page: {
    id: 'page',
    shapes: {},
    bindings: {},
  },
  pageState: {
    id: 'page',
    selectedIds: [],
    camera: {
      point: [0, 0],
      zoom: 1,
    },
  },
}

export const defaultStyle = {
  size: 8,
  strokeWidth: 0,
  thinning: 0.75,
  streamline: 0.5,
  smoothing: 0.5,
  taperStart: 0,
  taperEnd: 0,
  capStart: true,
  capEnd: true,
  isFilled: true,
  color: '#000',
}

export const initialState: State = {
  appState: {
    status: 'idle',
    tool: 'drawing',
    editingId: undefined,
    style: defaultStyle,
  },
  ...initialDoc,
}

export const context = React.createContext<AppState>({} as AppState)

export class AppState extends StateManager<State> {
  constructor(initial: State, id = 'create', reset = false) {
    super(initial, id, reset)
  }

  shapeUtils = shapeUtils

  protected clean = (state: State) => {
    for (const id in state.page.shapes) {
      if (!state.page.shapes[id]) {
        delete state.page.shapes[id]
      }
    }

    return state
  }

  onPointerDown: TLPointerEventHandler = (info) => {
    const { state } = this
    switch (state.appState.tool) {
      case 'drawing': {
        this.createShape(info.point)
        break
      }
      case 'erasing': {
        this.setSnapshot({
          page: {
            shapes: this.state.page.shapes,
          },
        })
        this.patchState({
          appState: {
            status: 'erasing',
          },
        })
        this.erase(info.point)
        break
      }
    }
  }

  onPointerMove: TLPointerEventHandler = (info) => {
    const { status, tool } = this.state.appState

    switch (tool) {
      case 'drawing': {
        if (status === 'drawing') {
          this.updateShape(info.point, info.pressure)
        }
        break
      }
      case 'erasing': {
        if (status === 'erasing') {
          this.erase(info.point)
        }
        break
      }
    }
  }

  onPointerUp: TLPointerEventHandler = (info) => {
    const { state } = this
    switch (state.appState.tool) {
      case 'drawing': {
        this.completeShape(info.point, info.pressure)
        break
      }
      case 'erasing': {
        this.setState({
          id: 'erased',
          before: this.snapshot,
          after: {
            appState: {
              status: 'idle',
            },
            page: {
              shapes: this.state.page.shapes,
            },
          },
        })
        break
      }
    }
  }

  createShape = (point: number[]) => {
    const { state } = this
    const camera = state.pageState.camera
    const pt = Vec.sub(Vec.div(point, camera.zoom), camera.point)
    const shape = shapeUtils.draw.create({
      id: Utils.uniqueId(),
      point: pt,
      style: state.appState.style,
      points: [
        [0, 0, 0.5],
        [0, 0, 0.5],
      ],
    })

    return this.patchState({
      appState: {
        status: 'drawing',
        editingId: shape.id,
      },
      page: {
        shapes: {
          [shape.id]: shape,
        },
      },
    })
  }

  updateShape = (point: number[], pressure: number) => {
    const { state } = this
    if (state.appState.status !== 'drawing') return this
    if (!state.appState.editingId) return this // Don't erase while drawing

    const shape = state.page.shapes[state.appState.editingId]
    const camera = state.pageState.camera
    const pt = Vec.sub(Vec.div(point, camera.zoom), camera.point)

    return this.patchState({
      page: {
        shapes: {
          [shape.id]: {
            points: [...shape.points, [...Vec.sub(pt, shape.point), pressure]],
          },
        },
      },
    })
  }

  completeShape = (point: number[], pressure: number) => {
    const { state } = this
    const { shapes } = state.page
    if (!state.appState.editingId) return this // Don't erase while drawing

    const shape = shapes[state.appState.editingId]
    const camera = state.pageState.camera
    const pt = Vec.sub(Vec.div(point, camera.zoom), camera.point)

    return this.setState({
      id: 'complete_shape',
      before: {
        appState: {
          status: 'idle',
          editingId: undefined,
        },
        page: {
          shapes: {
            [shape.id]: undefined,
          },
        },
      },
      after: {
        appState: {
          status: 'idle',
          editingId: undefined,
        },
        page: {
          shapes: {
            [shape.id]: shapeUtils.draw.onSessionComplete({
              ...shape,
              points: [
                ...shape.points,
                [...Vec.sub(pt, shape.point), pressure],
              ],
              isDone: true,
            }),
          },
        },
      },
    })
  }

  erase = (point: number[]) => {
    const { state } = this
    const camera = state.pageState.camera
    const pt = Vec.sub(Vec.div(point, camera.zoom), camera.point)
    const { getBounds } = shapeUtils.draw

    return this.patchState({
      page: {
        shapes: {
          ...Object.fromEntries(
            Object.entries(state.page.shapes).map(([id, shape]) => {
              const bounds = getBounds(shape)

              if (Vec.dist(pt, shape.point) < 10) {
                return [id, undefined]
              }

              if (Utils.pointInBounds(pt, bounds)) {
                const points = shapeUtils.draw.strokeCache.get(shape)

                if (
                  (points &&
                    pointInPolygon(Vec.sub(pt, shape.point), points)) ||
                  Vec.dist(pt, shape.point) < 10
                ) {
                  return [id, undefined]
                }
              }

              return [id, shape]
            })
          ),
        },
      },
    })
  }

  eraseAll = () => {
    const { state } = this
    const { shapes } = state.page
    if (state.appState.editingId) return this // Don't erase while drawing

    return this.setState({
      id: 'erase_all',
      before: {
        page: {
          shapes,
        },
      },
      after: {
        page: {
          shapes: {},
        },
      },
    })
  }

  startStyleUpdate = (key: keyof DrawStyles) => {
    const { state } = this
    const { shapes } = state.page

    return this.setSnapshot({
      appState: {
        style: state.appState.style,
      },
      page: {
        shapes: {
          ...Object.fromEntries(
            Object.entries(shapes).map(([id, { style }]) => [
              id,
              { style: { [key]: style[key] } },
            ])
          ),
        },
      },
    })
  }

  patchStyleForAllShapes = (style: Partial<DrawStyles>) => {
    const { shapes } = this.state.page

    return this.patchState({
      appState: {
        style,
      },
      page: {
        shapes: {
          ...Object.fromEntries(
            Object.keys(shapes).map((id) => [id, { style }])
          ),
        },
      },
    })
  }

  patchStyle = (style: Partial<DrawStyles>) => {
    return this.patchState({
      appState: {
        style,
      },
    })
  }

  finishStyleUpdate = () => {
    const { state, snapshot } = this
    const { shapes } = state.page

    return this.setState({
      id: 'finish_style_update',
      before: snapshot,
      after: {
        appState: {
          style: state.appState.style,
        },
        page: {
          shapes: {
            ...Object.fromEntries(
              Object.entries(shapes).map(([id, { style }]) => [id, { style }])
            ),
          },
        },
      },
    })
  }

  setNextStyleForAllShapes = (style: Partial<DrawStyles>) => {
    const { shapes } = this.state.page

    return this.setState({
      id: 'set_style',
      before: {
        appState: {
          style: Object.fromEntries(
            Object.keys(style).map((key) => [
              key,
              this.state.appState.style[key as keyof DrawStyles],
            ])
          ),
        },
        page: {
          shapes: {
            ...Object.fromEntries(
              Object.entries(shapes).map(([id, shape]) => [
                id,
                {
                  style: Object.fromEntries(
                    Object.keys(style).map((key) => [
                      key,
                      shape.style[key as keyof DrawStyles],
                    ])
                  ),
                },
              ])
            ),
          },
        },
      },
      after: {
        appState: {
          style,
        },
        page: {
          shapes: {
            ...Object.fromEntries(
              Object.keys(shapes).map((id) => [id, { style }])
            ),
          },
        },
      },
    })
  }

  deleteAll = () => {
    const { shapes } = this.state.page

    return this.setState({
      id: 'delete_all',
      before: {
        page: {
          shapes,
        },
      },
      after: {
        page: {
          shapes: {
            ...Object.fromEntries(
              Object.keys(shapes).map((key) => [key, undefined])
            ),
          },
        },
      },
    })
  }

  onPinchStart: TLPinchEventHandler = () => {
    if (this.state.appState.status !== 'idle') return

    this.patchState({
      appState: { status: 'pinching' },
    })
  }

  onPinchEnd: TLPinchEventHandler = () => {
    this.patchState({
      appState: { status: 'idle' },
    })
  }

  onPinch: TLPinchEventHandler = ({ point, delta }, e) => {
    if (this.state.appState.status !== 'pinching') return

    const { camera } = this.state.pageState
    const zoomDelta = delta[2] / 350
    const nextPoint = Vec.add(camera.point, Vec.div(delta, camera.zoom))
    const nextZoom = Utils.clamp(camera.zoom - zoomDelta * camera.zoom, 0.25, 5)
    const p0 = Vec.sub(Vec.div(point, camera.zoom), nextPoint)
    const p1 = Vec.sub(Vec.div(point, nextZoom), nextPoint)

    return this.patchState({
      pageState: {
        camera: {
          point: Vec.round(Vec.add(nextPoint, Vec.sub(p1, p0))),
          zoom: nextZoom,
        },
      },
    })
  }

  onPan: TLWheelEventHandler = (info) => {
    const { state } = this
    if (state.appState.status === 'pinching') return this

    const { camera } = state.pageState
    const delta = Vec.div(info.delta, camera.zoom)
    const prev = camera.point
    const next = Vec.sub(prev, delta)

    if (Vec.isEqual(next, prev)) return this

    const point = Vec.round(next)

    if (state.appState.editingId && state.appState.status === 'drawing') {
      const shape = state.page.shapes[state.appState.editingId]
      const camera = state.pageState.camera
      const pt = Vec.sub(Vec.div(info.point, camera.zoom), point)

      return this.patchState({
        pageState: {
          camera: {
            point,
          },
        },
        page: {
          shapes: {
            [shape.id]: {
              points: [...shape.points, [...Vec.sub(pt, shape.point), 0.5]],
            },
          },
        },
      })
    }

    return this.patchState({
      pageState: {
        camera: {
          point,
        },
      },
    })
  }

  selectDrawingTool = () => {
    this.patchState({
      appState: {
        tool: 'drawing',
      },
    })
  }

  selectErasingTool = () => {
    this.patchState({
      appState: {
        tool: 'erasing',
      },
    })
  }
}

export function useApp() {
  const appState = React.useContext(context)
  return appState
}

export function useAppState(): State
export function useAppState<K>(selector: StateSelector<State, K>): K
export function useAppState(selector?: StateSelector<State, any>) {
  const appState = React.useContext(context)
  if (selector) {
    return appState.useAppState(selector)
  }
  return appState.useAppState()
}