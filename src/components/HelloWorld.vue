<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';

import { GUI } from 'lil-gui';

const canvas = ref<HTMLCanvasElement>();
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let objects: (THREE.Mesh | THREE.Object3D)[] = [];
let gui: GUI;

// AxisGridHelper 类定义
class AxisGridHelper {
  public grid: THREE.GridHelper;
  public axes: THREE.AxesHelper;
  private _visible = false;

  constructor(node: THREE.Object3D, units = 10) {
    const axes = new THREE.AxesHelper();
    axes.material.depthTest = false;
    axes.renderOrder = 2; // 在网格之后渲染
    node.add(axes);

    const grid = new THREE.GridHelper(units, units);
    grid.material.depthTest = false;
    grid.renderOrder = 1;
    node.add(grid);

    this.grid = grid;
    this.axes = axes;
    this.visible = false;
  }

  get visible() {
    return this._visible;
  }

  set visible(v) {
    this._visible = v;
    this.grid.visible = v;
    this.axes.visible = v;
  }
}

// 处理窗口大小变化
function handleResize() {
  if (!camera || !renderer) return;

  // 更新相机
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // 更新渲染器
  renderer.setSize(window.innerWidth, window.innerHeight);
}
function render(time: number) {
  time *= 0.001; // 将时间单位变为秒

  objects.forEach((obj) => {
    obj.rotation.y = time;
  });

  renderer.render(scene, camera);

  requestAnimationFrame(render);
}
onMounted(() => {
  if (!canvas.value) return;

  // 创建场景
  scene = new THREE.Scene();

  // 创建相机
  const fov = 75;
  const aspect = window.innerWidth / window.innerHeight;
  const near = 0.1;
  const far = 1000;
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 50, 0);
  camera.up.set(0, 0, 1);
  camera.lookAt(0, 0, 0);

  // 创建渲染器，使用模板中定义的 canvas 元素
  renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  // 添加环境光
  const color = 0xffffff;
  const intensity = 500;
  const light = new THREE.PointLight(color, intensity);
  scene.add(light);
  // 要更新旋转角度的对象数组
  objects = [];

  // 创建GUI实例
  gui = new GUI();

  // 一球多用
  const radius = 1;
  const widthSegments = 6;
  const heightSegments = 6;
  const sphereGeometry = new THREE.SphereGeometry(
    radius,
    widthSegments,
    heightSegments
  );

  const solarSystem = new THREE.Object3D();
  scene.add(solarSystem);
  objects.push(solarSystem);

  const earthOrbit = new THREE.Object3D();
  earthOrbit.position.x = 10;
  solarSystem.add(earthOrbit);
  objects.push(earthOrbit);

  const sunMaterial = new THREE.MeshPhongMaterial({ emissive: 0xffff00 });
  const sunMesh = new THREE.Mesh(sphereGeometry, sunMaterial);
  sunMesh.scale.set(5, 5, 5); // 扩大太阳的大小
  solarSystem.add(sunMesh);
  objects.push(sunMesh);

  const earthMaterial = new THREE.MeshPhongMaterial({
    color: 0x2233ff,
    emissive: 0x112244,
  });
  const earthMesh = new THREE.Mesh(sphereGeometry, earthMaterial);
  // earthMesh.position.x = 10;
  earthOrbit.add(earthMesh);
  objects.push(earthMesh);

  const moonOrbit = new THREE.Object3D();
  moonOrbit.position.x = 2;
  earthOrbit.add(moonOrbit);
  const moonMaterial = new THREE.MeshPhongMaterial({
    color: 0x888888,
    emissive: 0x222222,
  });
  const moonMesh = new THREE.Mesh(sphereGeometry, moonMaterial);
  moonMesh.scale.set(0.5, 0.5, 0.5);
  moonOrbit.add(moonMesh);
  objects.push(moonMesh);

  function makeAxisGrid(node: THREE.Object3D, label: string, units = 10) {
    const helper = new AxisGridHelper(node, units);
    gui.add(helper, 'visible').name(label);
  }

  makeAxisGrid(solarSystem, 'solarSystem', 25);
  makeAxisGrid(sunMesh, 'sunMesh');
  makeAxisGrid(earthOrbit, 'earthOrbit');
  makeAxisGrid(earthMesh, 'earthMesh');
  makeAxisGrid(moonOrbit, 'moonOrbit');
  makeAxisGrid(moonMesh, 'moonMesh');
  // 渲染场景
  renderer.render(scene, camera);
  requestAnimationFrame(render);
  // 添加窗口大小变化监听器
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  // 移除窗口大小变化监听器
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <canvas id="c" ref="canvas"></canvas>
</template>

<style>
/* 确保canvas元素占满整个屏幕 */
canvas {
  display: block;
  width: 100vw;
  height: 100vh;
}
</style>
