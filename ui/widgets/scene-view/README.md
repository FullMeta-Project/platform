# Scene view renderer

`drawSceneView` renders normalized geometry and mesh primitives. It does not inspect model JSON, evaluate application geometry, or own pointer interactions. The host converts application data into a scene, keeps camera state, and redraws after user input.

```js
drawSceneView({ canvas, scene, view });
```

The scene shape is documented by [`scene-view-data-1.schema.json`](scene-view-data-1.schema.json): `dimension` is `2` or `3`, and `primitives` is a list of `point`, `polyline`, or `triangle` records. Each primitive contains coordinate arrays in `points`, plus optional generic `stroke`, `fill`, `lineWidth`, `opacity`, and `closed` style properties. Two dimensional positions use `[x, y]`; three dimensional positions use `[x, y, z]`.

An optional `project(position)` callback lets a host share its existing camera projection. Without it, the renderer fits the scene and uses a default orthographic view. `view` can provide `center`, `yaw`, `pitch`, `zoom`, and pixel `pan`. The renderer only draws; mouse, touch, selection, axes, legends, and application-specific summaries remain host responsibilities. When drawing into a canvas that already has content, pass `clear: false` and `background: null` to layer the scene without erasing earlier layers.
