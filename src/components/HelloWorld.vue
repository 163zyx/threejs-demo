<script setup lang="ts">
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import TWEEN from 'three/addons/libs/tween.module.js';
import { onMounted } from 'vue';

/**
 * TweenManager 类 - 用于管理 TWEEN 动画
 * 跟踪动画数量并处理动画完成事件
 */
class TweenManager {
  numTweensRunning: number;
  /**
   * 构造函数
   */
  constructor() {
    // 跟踪当前运行的动画数量
    this.numTweensRunning = 0;
  }

  /**
   * 处理动画完成事件
   * 减少运行动画计数
   */
  _handleComplete() {
    --this.numTweensRunning;
    console.assert(this.numTweensRunning >= 0); /* eslint no-console: off */
  }

  /**
   * 创建新的动画
   * @param {Object} targetObject - 动画目标对象
   * @returns {TWEEN.Tween} - 创建的 Tween 实例
   */
  createTween(targetObject: number[]) {
    const self = this;
    ++this.numTweensRunning;
    let userCompleteFn: (...args: any[]) => void = () => {};

    // 创建新的 tween 并安装自己的 onComplete 回调
    const tween = new TWEEN.Tween(targetObject).onComplete((...args) => {
      self._handleComplete();
      userCompleteFn.call(this, ...args);
    });

    // 替换 tween 的 onComplete 函数，以便在用户提供回调时调用它
    tween.onComplete = (fn) => {
      userCompleteFn = fn || (() => {});
      return tween;
    };

    return tween;
  }

  /**
   * 更新所有动画
   * @returns {boolean} - 是否有动画正在运行
   */
  update() {
    TWEEN.update();
    return this.numTweensRunning > 0;
  }
}

/**
 * 主函数 - 初始化和运行 Three.js 场景
 */
function main() {
  // 创建 WebGL 渲染器
  const canvasElement = document.querySelector<HTMLCanvasElement>('#c');
  if (!canvasElement) throw new Error('Canvas element not found');
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas: canvasElement,
  });

  // 创建 TweenManager 实例
  const tweenManager = new TweenManager();

  // 设置相机参数
  const fov = 60; // 视场角
  const aspect = 2; // 画布默认宽高比
  const near = 0.1; // 近裁剪面
  const far = 10; // 远裁剪面
  // 创建透视相机
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  // 设置相机位置
  camera.position.z = 2.5;

  // 创建轨道控制器
  const controls = new OrbitControls(camera, canvasElement);
  controls.enableDamping = true; // 启用阻尼效果
  controls.enablePan = false; // 禁用平移
  controls.minDistance = 1.2; // 最小距离
  controls.maxDistance = 4; // 最大距离
  controls.update(); // 更新控制器

  // 创建场景
  const scene = new THREE.Scene();
  // 设置场景背景颜色
  scene.background = new THREE.Color('black');

  // 加载地球纹理
  {
    const loader = new THREE.TextureLoader();
    // 加载世界地图纹理
    const texture = loader.load(
      'https://threejs.org/manual/examples/resources/images/world.jpg',
      render // 加载完成后渲染
    );
    // 设置纹理颜色空间
    texture.colorSpace = THREE.SRGBColorSpace;
    // 创建球体几何体
    const geometry = new THREE.SphereGeometry(1, 64, 32);
    // 创建基础材质，使用加载的纹理
    const material = new THREE.MeshBasicMaterial({ map: texture });
    // 创建网格并添加到场景
    scene.add(new THREE.Mesh(geometry, material));
  }

  /**
   * 加载文件内容
   * @param {string} url - 文件 URL
   * @returns {Promise<string>} - 文件文本内容
   */
  async function loadFile(url: string) {
    const req = await fetch(url);
    return req.text();
  }

  /**
   * 解析数据文件
   * @param {string} text - 文件文本内容
   * @returns {Object} - 包含数据、设置、最小值和最大值的对象
   */
  function parseData(text: string) {
    const data: number | string[][] = [];
    const settings = { data };
    let max: number;
    let min: number;
    // 按行分割文本
    text.split('\n').forEach((line) => {
      // 按空白字符分割行
      const parts = line.trim().split(/\s+/);
      if (parts.length === 2) {
        // 只有 2 个部分，必须是键值对
        settings[parts[0]] = parseFloat(parts[1]);
      } else if (parts.length > 2) {
        // 超过 2 个部分，必须是数据
        const values = parts.map((v) => {
          const value = parseFloat(v);
          if (value === settings.NODATA_value) {
            return undefined;
          }

          max = Math.max(max === undefined ? value : max, value);
          min = Math.min(min === undefined ? value : min, value);
          return value;
        });
        data.push(values);
      }
    });
    return Object.assign(settings, { min, max });
  }

  /**
   * 检查任何数据集在指定经纬度是否有缺失数据
   * @param {Array} fileInfos - 文件信息数组
   * @param {number} latNdx - 纬度索引
   * @param {number} lonNdx - 经度索引
   * @returns {boolean} - 是否有缺失数据
   */
  function dataMissingInAnySet(fileInfos, latNdx, lonNdx) {
    for (const fileInfo of fileInfos) {
      if (fileInfo.file.data[latNdx][lonNdx] === undefined) {
        return true;
      }
    }

    return false;
  }

  /**
   * 创建表示数据的立方体
   * @param {Object} file - 数据文件对象
   * @param {Array} hueRange - 色调范围 [min, max]
   * @param {Array} fileInfos - 文件信息数组
   * @returns {THREE.BufferGeometry} - 合并后的几何体
   */
  function makeBoxes(file, hueRange, fileInfos) {
    const { min, max, data } = file;
    const range = max - min;

    // 创建辅助对象来定位立方体
    // lonHelper 用于根据经度旋转
    const lonHelper = new THREE.Object3D();
    scene.add(lonHelper);
    // latHelper 用于根据纬度旋转
    const latHelper = new THREE.Object3D();
    lonHelper.add(latHelper);
    // positionHelper 用于将对象移动到球体边缘
    const positionHelper = new THREE.Object3D();
    positionHelper.position.z = 1;
    latHelper.add(positionHelper);
    // originHelper 用于移动立方体中心，使其从 Z 轴缩放
    const originHelper = new THREE.Object3D();
    originHelper.position.z = 0.5;
    positionHelper.add(originHelper);

    const color = new THREE.Color();

    // 调整经纬度的偏移量
    const lonFudge = Math.PI * 0.5;
    const latFudge = Math.PI * -0.135;
    const geometries = [];

    // 遍历数据
    data.forEach((row, latNdx) => {
      row.forEach((value, lonNdx) => {
        // 跳过任何数据集缺失的数据
        if (dataMissingInAnySet(fileInfos, latNdx, lonNdx)) {
          return;
        }

        // 计算归一化值
        const amount = (value - min) / range;

        // 创建立方体几何体
        const boxWidth = 1;
        const boxHeight = 1;
        const boxDepth = 1;
        const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

        // 调整辅助对象以指向正确的经纬度
        lonHelper.rotation.y =
          THREE.MathUtils.degToRad(lonNdx + file.xllcorner) + lonFudge;
        latHelper.rotation.x =
          THREE.MathUtils.degToRad(latNdx + file.yllcorner) + latFudge;

        // 使用 originHelper 的世界矩阵来定位几何体
        positionHelper.scale.set(
          0.005,
          0.005,
          THREE.MathUtils.lerp(0.01, 0.5, amount) // 根据数据值调整高度
        );
        originHelper.updateWorldMatrix(true, false);
        geometry.applyMatrix4(originHelper.matrixWorld);

        // 计算颜色
        const hue = THREE.MathUtils.lerp(...hueRange, amount);
        const saturation = 1;
        const lightness = THREE.MathUtils.lerp(0.4, 1.0, amount);
        color.setHSL(hue, saturation, lightness);
        // 获取 0-255 范围的颜色值
        const rgb = color.toArray().map((v) => v * 255);

        // 创建顶点颜色数组
        const numVerts = geometry.getAttribute('position').count;
        const itemSize = 3; // r, g, b
        const colors = new Uint8Array(itemSize * numVerts);

        // 为每个顶点设置颜色
        colors.forEach((v, ndx) => {
          colors[ndx] = rgb[ndx % 3];
        });

        // 创建颜色属性并添加到几何体
        const normalized = true;
        const colorAttrib = new THREE.BufferAttribute(
          colors,
          itemSize,
          normalized
        );
        geometry.setAttribute('color', colorAttrib);

        // 将几何体添加到数组
        geometries.push(geometry);
      });
    });

    // 合并所有几何体
    return BufferGeometryUtils.mergeGeometries(geometries, false);
  }

  /**
   * 加载单个数据文件
   * @param {Object} info - 文件信息对象
   */
  async function loadData(info: {
    name: string;
    hueRange: number[];
    url: string;
  }) {
    const text = await loadFile(info.url);
    info.file = parseData(text);
  }

  /**
   * 加载所有数据文件并创建可视化
   */
  async function loadAll() {
    // 定义要加载的数据文件信息
    const fileInfos = [
      {
        name: 'men',
        hueRange: [0.7, 0.3], // 蓝色调范围
        url: 'https://threejs.org/manual/examples/resources/data/gpw/gpw_v4_basic_demographic_characteristics_rev10_a000_014mt_2010_cntm_1_deg.asc',
      },
      {
        name: 'women',
        hueRange: [0.9, 1.1], // 粉红色调范围
        url: 'https://threejs.org/manual/examples/resources/data/gpw/gpw_v4_basic_demographic_characteristics_rev10_a000_014ft_2010_cntm_1_deg.asc',
      },
    ];

    // 并行加载所有数据文件
    await Promise.all(fileInfos.map(loadData));

    /**
     * 映射数据值
     * @param {Array} data - 二维数据数组
     * @param {Function} fn - 映射函数
     * @returns {Array} - 映射后的数据
     */
    function mapValues(data, fn) {
      return data.map((row, rowNdx) => {
        return row.map((value, colNdx) => {
          return fn(value, rowNdx, colNdx);
        });
      });
    }

    /**
     * 创建差异数据文件
     * @param {Object} baseFile - 基础文件
     * @param {Object} otherFile - 比较文件
     * @param {Function} compareFn - 比较函数
     * @returns {Object} - 差异数据文件
     */
    function makeDiffFile(baseFile, otherFile, compareFn) {
      let min;
      let max;
      const baseData = baseFile.data;
      const otherData = otherFile.data;
      const data = mapValues(baseData, (base, rowNdx, colNdx) => {
        const other = otherData[rowNdx][colNdx];
        if (base === undefined || other === undefined) {
          return undefined;
        }

        const value = compareFn(base, other);
        min = Math.min(min === undefined ? value : min, value);
        max = Math.max(max === undefined ? value : max, value);
        return value;
      });
      // 复制基础文件并替换最小、最大和数据
      return { ...baseFile, min, max, data };
    }

    // 生成新的数据集
    {
      const menInfo = fileInfos[0];
      const womenInfo = fileInfos[1];
      const menFile = menInfo.file;
      const womenFile = womenInfo.file;

      /**
       * 计算一个值比另一个值大多少
       * @param {number} a - 第一个值
       * @param {number} b - 第二个值
       * @returns {number} - 差值，最小为0
       */
      function amountGreaterThan(a, b) {
        return Math.max(a - b, 0);
      }

      // 添加男性人口多于女性的数据集
      fileInfos.push({
        name: '>50%men',
        hueRange: [0.6, 1.1], // 蓝绿色调
        file: makeDiffFile(menFile, womenFile, (men, women) => {
          return amountGreaterThan(men, women);
        }),
      });
      // 添加女性人口多于男性的数据集
      fileInfos.push({
        name: '>50% women',
        hueRange: [0.0, 0.4], // 粉红色调
        file: makeDiffFile(womenFile, menFile, (women, men) => {
          return amountGreaterThan(women, men);
        }),
      });
    }

    // 为每个数据集创建几何体
    const geometries = fileInfos.map((info) => {
      return makeBoxes(info.file, info.hueRange, fileInfos);
    });

    // 使用第一个几何体作为基础
    // 并将所有几何体添加为 morph targets
    const baseGeometry = geometries[0];
    baseGeometry.morphAttributes.position = geometries.map((geometry, ndx) => {
      const attribute = geometry.getAttribute('position');
      const name = `target${ndx}`;
      attribute.name = name;
      return attribute;
    });
    baseGeometry.morphAttributes.color = geometries.map((geometry, ndx) => {
      const attribute = geometry.getAttribute('color');
      const name = `target${ndx}`;
      attribute.name = name;
      return attribute;
    });
    // 创建基础材质，启用顶点颜色
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
    });
    // 创建网格并添加到场景
    const mesh = new THREE.Mesh(baseGeometry, material);
    scene.add(mesh);

    /**
     * 显示选中的数据集，隐藏其他数据集
     * @param {Array} fileInfos - 文件信息数组
     * @param {Object} fileInfo - 要显示的文件信息
     */
    function showFileInfo(fileInfos, fileInfo) {
      const targets = {};
      fileInfos.forEach((info, i) => {
        const visible = fileInfo === info;
        info.elem.className = visible ? 'selected' : '';
        targets[i] = visible ? 1 : 0;
      });
      const durationInMs = 1000;
      // 创建动画来过渡到选中的数据集
      tweenManager
        .createTween(mesh.morphTargetInfluences)
        .to(targets, durationInMs)
        .start();
      requestRenderIfNotRequested();
    }

    // 创建 UI 元素
    const uiElem = document.querySelector('#ui');
    fileInfos.forEach((info) => {
      const div = document.createElement('div');
      info.elem = div;
      div.textContent = info.name;
      uiElem.appendChild(div);
      function show() {
        showFileInfo(fileInfos, info);
      }

      // 添加鼠标悬停和触摸事件
      div.addEventListener('mouseover', show);
      div.addEventListener('touchstart', show);
    });
    // 显示第一个数据集
    showFileInfo(fileInfos, fileInfos[0]);
  }

  // 加载所有数据并创建可视化
  loadAll();

  /**
   * 调整渲染器大小以匹配显示大小
   * @param {THREE.WebGLRenderer} renderer - WebGL 渲染器
   * @returns {boolean} - 是否调整了大小
   */
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }

    return needResize;
  }

  // 跟踪是否已请求渲染
  let renderRequested = false;

  /**
   * 渲染函数
   */
  function render() {
    renderRequested = undefined;

    // 调整渲染器大小
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    // 更新动画
    if (tweenManager.update()) {
      requestRenderIfNotRequested();
    }

    // 更新控制器
    controls.update();
    // 渲染场景
    renderer.render(scene, camera);
  }

  // 初始渲染
  render();

  /**
   * 请求渲染（如果尚未请求）
   */
  function requestRenderIfNotRequested() {
    if (!renderRequested) {
      renderRequested = true;
      requestAnimationFrame(render);
    }
  }

  // 添加事件监听器
  controls.addEventListener('change', requestRenderIfNotRequested);
  window.addEventListener('resize', requestRenderIfNotRequested);
}

// 调用主函数
onMounted(main);
</script>

<template>
  <div class="container">
    <canvas id="c" ref="canvas"></canvas>
    <div id="ui"></div>
  </div>
</template>

<style>
/* 容器样式 */
.container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* 确保canvas元素占满整个屏幕 */
canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* UI样式 */
#ui {
  position: absolute;
  top: 10px;
  left: 10px;
  color: white;
  font-family: Arial, sans-serif;
  font-size: 14px;
}

#ui div {
  padding: 5px;
  cursor: pointer;
}

#ui div.selected {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}
</style>
