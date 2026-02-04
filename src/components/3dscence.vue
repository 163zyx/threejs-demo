<script setup lang="ts">
/**
 * 3dscence.vue - Three.js 3D场景示例
 * 展示了一个包含三个旋转立方体的3D场景，背景是立方体贴图
 */

// 导入Three.js库
import * as THREE from 'three';
// 导入Vue的onMounted生命周期钩子
import { onMounted } from 'vue';
// 导入轨道控制器，用于交互式控制相机视角
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * 主函数 - 初始化和运行3D场景
 */
function main() {
  // 获取canvas元素
  const canvas = document.querySelector('#c');

  // 创建WebGL渲染器
  const renderer = new THREE.WebGLRenderer({
    antialias: true, // 启用抗锯齿，使渲染更平滑
    canvas: canvas as HTMLCanvasElement, // 将canvas元素传递给渲染器
  });

  // 设置相机参数
  const fov = 75; // 视场角，单位为度
  const aspect = 2; // 画布默认宽高比
  const near = 0.1; // 近裁剪面
  const far = 100; // 远裁剪面

  // 创建透视相机
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  // 设置相机位置
  camera.position.z = 3;

  // 创建轨道控制器，用于交互式控制相机视角
  const controls = new OrbitControls(camera, canvas as HTMLCanvasElement);
  // 设置控制器的目标点
  controls.target.set(0, 0, 0);
  // 更新控制器
  controls.update();

  // 创建场景
  const scene = new THREE.Scene();

  // 添加方向光
  {
    const color = 0xffffff; // 灯光颜色
    const intensity = 3; // 灯光强度
    const light = new THREE.DirectionalLight(color, intensity);
    // 设置灯光位置
    light.position.set(-1, 2, 4);
    // 将灯光添加到场景
    scene.add(light);
  }

  // 设置立方体尺寸
  const boxWidth = 1;
  const boxHeight = 1;
  const boxDepth = 1;

  // 创建立方体几何体
  const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

  /**
   * 创建立方体实例
   * @param geometry - 立方体几何体
   * @param color - 立方体颜色
   * @param x - 立方体在x轴上的位置
   * @returns - 创建的立方体网格对象
   */
  function makeInstance(
    geometry: THREE.BufferGeometry,
    color: number,
    x: number
  ) {
    // 创建材质
    const material = new THREE.MeshPhongMaterial({ color });

    // 创建网格对象
    const cube = new THREE.Mesh(geometry, material);
    // 将立方体添加到场景
    scene.add(cube);

    // 设置立方体位置
    cube.position.x = x;

    return cube;
  }

  // 创建三个立方体实例，分别位于不同的x轴位置，使用不同的颜色
  const cubes = [
    makeInstance(geometry, 0x44aa88, 0), // 绿色立方体，位于中心
    makeInstance(geometry, 0x8844aa, -2), // 紫色立方体，位于左侧
    makeInstance(geometry, 0xaa8844, 2), // 棕色立方体，位于右侧
  ];

  // 加载背景立方体贴图
  {
    // 创建立方体贴图加载器
    const loader = new THREE.CubeTextureLoader();
    // 加载立方体贴图
    const texture = loader.load([
      'https://threejs.org/manual/examples/resources/images/cubemaps/computer-history-museum/pos-x.jpg', // 右侧
      'https://threejs.org/manual/examples/resources/images/cubemaps/computer-history-museum/neg-x.jpg', // 左侧
      'https://threejs.org/manual/examples/resources/images/cubemaps/computer-history-museum/pos-y.jpg', // 顶部
      'https://threejs.org/manual/examples/resources/images/cubemaps/computer-history-museum/neg-y.jpg', // 底部
      'https://threejs.org/manual/examples/resources/images/cubemaps/computer-history-museum/pos-z.jpg', // 前方
      'https://threejs.org/manual/examples/resources/images/cubemaps/computer-history-museum/neg-z.jpg', // 后方
    ]);
    // 将纹理设置为场景背景
    scene.background = texture;
  }

  /**
   * 调整渲染器大小以匹配显示大小
   * @param renderer - WebGL渲染器
   * @returns - 是否调整了大小
   */
  function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }

    return needResize;
  }

  /**
   * 渲染函数 - 负责渲染场景和更新动画
   * @param time - 时间戳，用于动画
   */
  function render(time: number) {
    // 将时间戳转换为秒
    time *= 0.001;

    // 调整渲染器大小
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    // 更新立方体旋转
    cubes.forEach((cube, ndx) => {
      // 为每个立方体设置不同的旋转速度
      const speed = 1 + ndx * 0.1;
      // 计算旋转角度
      const rot = time * speed;
      // 更新立方体的旋转
      cube.rotation.x = rot;
      cube.rotation.y = rot;
    });

    // 渲染场景
    renderer.render(scene, camera);

    // 请求下一帧渲染
    requestAnimationFrame(render);
  }

  // 开始渲染循环
  requestAnimationFrame(render);
}

// 当组件挂载后调用主函数
onMounted(main);
</script>

<template>
  <!-- 容器元素 -->
  <div class="container">
    <!-- 3D场景画布 -->
    <canvas id="c" ref="canvas"></canvas>
    <!-- UI元素容器 -->
    <div id="ui"></div>
  </div>
</template>

<style>
/* 容器样式 */
.container {
  position: relative; /* 相对定位，为子元素的绝对定位做准备 */
  width: 100vw; /* 宽度占满整个视口 */
  height: 100vh; /* 高度占满整个视口 */
  overflow: hidden; /* 隐藏溢出内容 */
}

/* 确保canvas元素占满整个屏幕 */
canvas {
  display: block; /* 块级元素，消除默认边距 */
  width: 100%; /* 宽度占满容器 */
  height: 100%; /* 高度占满容器 */
}

/* UI样式 */
#ui {
  position: absolute; /* 绝对定位，位于容器左上角 */
  top: 10px; /* 距离顶部10px */
  left: 10px; /* 距离左侧10px */
  color: white; /* 文本颜色为白色 */
  font-family: Arial, sans-serif; /* 字体 */
  font-size: 14px; /* 字体大小 */
}

/* UI子元素样式 */
#ui div {
  padding: 5px; /* 内边距5px */
  cursor: pointer; /* 鼠标悬停时显示指针 */
}

/* 选中状态的UI子元素样式 */
#ui div.selected {
  background-color: rgba(255, 255, 255, 0.2); /* 半透明白色背景 */
  border-radius: 3px; /* 3px圆角 */
}
</style>
