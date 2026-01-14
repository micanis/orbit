'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function SphericalProjection() {
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const container3dRef = useRef<HTMLDivElement>(null);
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [isPoint2Enabled, setIsPoint2Enabled] = useState(true);
  const [isGreatCircleEnabled, setIsGreatCircleEnabled] = useState(false);
  const [activePointIdx, setActivePointIdx] = useState(0);

  // UI state
  const [p1Stats, setP1Stats] = useState({ phi: '0', theta: '0' });
  const [p2Stats, setP2Stats] = useState({ phi: '0', theta: '0' });
  const [mathData, setMathData] = useState({
    name: 'Point 1',
    colorClass: 'text-blue-400',
    theta: '0°',
    phi: '0°',
    sinTheta: '0.000',
    cosTheta: '1.000',
    sinPhi: '0.000',
    cosPhi: '1.000',
    x: '0.000',
    y: '0.000',
    z: '1.000'
  });

  useEffect(() => {
    const MAX_THETA = Math.PI / 2;

    const canvasState = {
      cx: 0,
      cy: 0,
      maxRadiusPx: 0
    };

    const points = [
      {
        id: 0,
        name: 'Point 1',
        colorHex: 0x3b82f6,
        cssColor: '#3b82f6',
        u: 0,
        v: 0,
        theta: 0,
        phi: 0,
        radiusPx: 0,
        vec: new THREE.Vector3(0, 0, 1),
        visuals: {} as any
      },
      {
        id: 1,
        name: 'Point 2',
        colorHex: 0xd946ef,
        cssColor: '#d946ef',
        u: 0,
        v: 0,
        theta: 0,
        phi: 0,
        radiusPx: 0,
        vec: new THREE.Vector3(0, 0, 1),
        visuals: {} as any
      }
    ];

    let currentActiveIdx = activePointIdx;
    let isDragging = false;

    // Utility functions
    const toDeg = (rad: number) => (rad * 180 / Math.PI).toFixed(1);
    const fmt = (val: number) => {
      const s = val.toFixed(3);
      return s === '-0.000' ? '0.000' : s;
    };

    // 2D Canvas setup
    const canvas2d = canvas2dRef.current;
    if (!canvas2d) return;
    const ctx2d = canvas2d.getContext('2d');
    if (!ctx2d) return;

    function resize2d() {
      if (!canvas2d) return;
      const rect = canvas2d.parentElement!.getBoundingClientRect();
      canvas2d.width = rect.width;
      canvas2d.height = rect.height;
      canvasState.cx = canvas2d.width / 2;
      canvasState.cy = canvas2d.height / 2;
      canvasState.maxRadiusPx = Math.min(canvasState.cx, canvasState.cy) * 0.9;
      draw2d();
    }

    function updateUI() {
      const p1 = points[0];
      const p2 = points[1];
      setP1Stats({ phi: toDeg(p1.phi), theta: toDeg(p1.theta) });
      setP2Stats({ phi: toDeg(p2.phi), theta: toDeg(p2.theta) });

      const activeP = points[currentActiveIdx];
      const degT = toDeg(activeP.theta) + '°';
      const degP = toDeg(activeP.phi) + '°';
      const sinT = Math.sin(activeP.theta);
      const cosT = Math.cos(activeP.theta);
      const sinP = Math.sin(activeP.phi);
      const cosP = Math.cos(activeP.phi);

      setMathData({
        name: activeP.name,
        colorClass: activeP.id === 0 ? 'text-blue-400' : 'text-fuchsia-400',
        theta: degT,
        phi: degP,
        sinTheta: fmt(sinT),
        cosTheta: fmt(cosT),
        sinPhi: fmt(sinP),
        cosPhi: fmt(cosP),
        x: fmt(activeP.vec.x),
        y: fmt(activeP.vec.y),
        z: fmt(activeP.vec.z)
      });
    }

    function updatePointFromUV(idx: number, u: number, v: number) {
      const p = points[idx];
      p.u = u;
      p.v = v;

      const dx = u - canvasState.cx;
      const dy = canvasState.cy - v;

      p.radiusPx = Math.sqrt(dx * dx + dy * dy);
      p.phi = Math.atan2(dy, dx);
      p.theta = (p.radiusPx / canvasState.maxRadiusPx) * MAX_THETA;

      if (p.theta > MAX_THETA) p.theta = MAX_THETA;

      const sinT = Math.sin(p.theta);
      const cosT = Math.cos(p.theta);
      const sinP = Math.sin(p.phi);
      const cosP = Math.cos(p.phi);

      p.vec.set(sinT * cosP, sinT * sinP, cosT);

      updateUI();
      draw2d();
      update3d(idx);
      updateGreatCircle();
    }

    function draw2d() {
      if (!canvas2d || canvas2d.width === 0 || canvas2d.height === 0) return;

      ctx2d!.fillStyle = '#111827';
      ctx2d!.fillRect(0, 0, canvas2d.width, canvas2d.height);

      ctx2d!.strokeStyle = '#374151';
      ctx2d!.lineWidth = 1;
      ctx2d!.beginPath();
      ctx2d!.moveTo(canvasState.cx, 0);
      ctx2d!.lineTo(canvasState.cx, canvas2d.height);
      ctx2d!.moveTo(0, canvasState.cy);
      ctx2d!.lineTo(canvas2d.width, canvasState.cy);
      ctx2d!.stroke();

      const drawCircle = (r: number, label: string) => {
        ctx2d!.strokeStyle = '#4b5563';
        ctx2d!.beginPath();
        ctx2d!.arc(canvasState.cx, canvasState.cy, r, 0, Math.PI * 2);
        ctx2d!.stroke();
        if (isUiVisible) {
          ctx2d!.fillStyle = '#9ca3af';
          ctx2d!.fillText(label, canvasState.cx + r + 2, canvasState.cy - 2);
        }
      };
      drawCircle(canvasState.maxRadiusPx / 2, 'θ=45°');
      drawCircle(canvasState.maxRadiusPx, 'θ=90°');

      const sortedPoints = [...points].sort((a, b) =>
        a.id === currentActiveIdx ? 1 : -1
      );

      sortedPoints.forEach((p) => {
        if (p.id === 1 && !isPoint2Enabled) return;

        const isActive = p.id === currentActiveIdx;

        ctx2d!.strokeStyle = p.cssColor;
        ctx2d!.globalAlpha = isActive ? 1.0 : 0.4;
        ctx2d!.setLineDash([5, 5]);
        ctx2d!.beginPath();
        ctx2d!.moveTo(canvasState.cx, canvasState.cy);
        ctx2d!.lineTo(p.u, p.v);
        ctx2d!.stroke();
        ctx2d!.setLineDash([]);
        ctx2d!.globalAlpha = 1.0;

        const arcRadius = 25 + p.id * 8;
        ctx2d!.strokeStyle = p.cssColor;
        ctx2d!.beginPath();
        ctx2d!.arc(canvasState.cx, canvasState.cy, arcRadius, 0, -p.phi, p.phi > 0);
        ctx2d!.stroke();

        ctx2d!.fillStyle = p.cssColor;
        ctx2d!.beginPath();
        ctx2d!.arc(p.u, p.v, isActive ? 8 : 6, 0, Math.PI * 2);
        ctx2d!.fill();

        if (isActive) {
          ctx2d!.strokeStyle = 'white';
          ctx2d!.lineWidth = 2;
          ctx2d!.stroke();
          ctx2d!.lineWidth = 1;
        }
      });
    }

    function handleInputStart(clientX: number, clientY: number) {
      const rect = canvas2d!.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      let minDist = Infinity;
      let targetIdx = 0;

      points.forEach((p) => {
        if (!isPoint2Enabled && p.id === 1) return;

        const dx = p.u - mouseX;
        const dy = p.v - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          targetIdx = p.id;
        }
      });

      currentActiveIdx = targetIdx;
      setActivePointIdx(targetIdx);
      isDragging = true;
      updatePointFromUV(currentActiveIdx, mouseX, mouseY);
    }

    function handleInputMove(clientX: number, clientY: number) {
      if (!isDragging) return;
      const rect = canvas2d!.getBoundingClientRect();
      updatePointFromUV(currentActiveIdx, clientX - rect.left, clientY - rect.top);
    }

    const mouseDown = (e: MouseEvent) => handleInputStart(e.clientX, e.clientY);
    const mouseMove = (e: MouseEvent) => handleInputMove(e.clientX, e.clientY);
    const mouseUp = () => (isDragging = false);
    const touchStart = (e: TouchEvent) => {
      handleInputStart(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    };
    const touchMove = (e: TouchEvent) => {
      handleInputMove(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    };
    const touchEnd = () => (isDragging = false);

    canvas2d.addEventListener('mousedown', mouseDown);
    window.addEventListener('mousemove', mouseMove);
    window.addEventListener('mouseup', mouseUp);
    canvas2d.addEventListener('touchstart', touchStart, { passive: false });
    window.addEventListener('touchmove', touchMove, { passive: false });
    window.addEventListener('touchend', touchEnd);

    // 3D Setup
    const container3d = container3dRef.current;
    if (!container3d) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container3d.clientWidth / container3d.clientHeight,
      0.1,
      100
    );
    camera.position.set(2.5, 2.5, 2.0);
    camera.up.set(0, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container3d.clientWidth, container3d.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container3d.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 5, 10);
    scene.add(dirLight);
    scene.add(new THREE.AxesHelper(1.5));

    const sphereGeo = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x444444,
      wireframe: true,
      transparent: true,
      opacity: 0.15
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.rotation.x = Math.PI / 2;
    scene.add(sphere);

    const equatorialGrid = new THREE.GridHelper(2, 20, 0x555555, 0x222222);
    equatorialGrid.rotation.x = Math.PI / 2;
    scene.add(equatorialGrid);

    const zAxisLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 1.5)
      ]),
      new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.3 })
    );
    scene.add(zAxisLine);

    const circleCurve = new THREE.EllipseCurve(0, 0, 1, 1, 0, 2 * Math.PI, false, 0);
    const circlePoints = circleCurve.getPoints(64);
    const circleGeo = new THREE.BufferGeometry().setFromPoints(circlePoints);
    const greatCircle = new THREE.LineLoop(
      circleGeo,
      new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2 })
    );
    greatCircle.visible = false;
    scene.add(greatCircle);

    points.forEach((p) => {
      p.visuals.arrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, 0),
        1,
        p.colorHex,
        0.1,
        0.05
      );
      scene.add(p.visuals.arrow);

      const lineMat = new THREE.LineDashedMaterial({
        color: 0xaaaaaa,
        dashSize: 0.1,
        gapSize: 0.05
      });
      const dropGeo = new THREE.BufferGeometry();
      p.visuals.dropLine = new THREE.Line(dropGeo, lineMat);
      scene.add(p.visuals.dropLine);

      const rMat = new THREE.LineBasicMaterial({
        color: p.colorHex,
        transparent: true,
        opacity: 0.5
      });
      const rGeo = new THREE.BufferGeometry();
      p.visuals.radiusLine = new THREE.Line(rGeo, rMat);
      scene.add(p.visuals.radiusLine);

      const phiMat = new THREE.LineBasicMaterial({ color: p.colorHex });
      const phiGeo = new THREE.BufferGeometry();
      p.visuals.phiArc = new THREE.Line(phiGeo, phiMat);
      scene.add(p.visuals.phiArc);

      const thetaMat = new THREE.LineBasicMaterial({ color: p.colorHex });
      const thetaGeo = new THREE.BufferGeometry();
      p.visuals.thetaArc = new THREE.Line(thetaGeo, thetaMat);
      scene.add(p.visuals.thetaArc);
    });

    function update3d(pointIdx: number) {
      const p = points[pointIdx];

      const visible = p.id === 0 || isPoint2Enabled;
      p.visuals.arrow.visible = visible;
      p.visuals.dropLine.visible = visible;
      p.visuals.radiusLine.visible = visible;
      p.visuals.phiArc.visible = visible;
      p.visuals.thetaArc.visible = visible;

      if (!visible) return;

      const v = p.vec;
      const x = v.x,
        y = v.y,
        z = v.z;

      p.visuals.arrow.setDirection(v);

      p.visuals.dropLine.geometry.setFromPoints([
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(x, y, 0)
      ]);
      p.visuals.dropLine.computeLineDistances();

      p.visuals.radiusLine.geometry.setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(x, y, 0)
      ]);

      const phiPts = [];
      const phiRes = 30;
      const phiRadius = 0.3 + p.id * 0.1;
      const startP = 0;
      const endP = p.phi;
      for (let i = 0; i <= phiRes; i++) {
        const ang = startP + ((endP - startP) * i) / phiRes;
        phiPts.push(new THREE.Vector3(phiRadius * Math.cos(ang), phiRadius * Math.sin(ang), 0));
      }
      p.visuals.phiArc.geometry.setFromPoints(phiPts);

      const thetaPts = [];
      const thetaRes = 30;
      const thetaRadius = 0.4 + p.id * 0.1;
      for (let i = 0; i <= thetaRes; i++) {
        const ang = (p.theta * i) / thetaRes;
        const r_xy = Math.sin(ang) * thetaRadius;
        const z_local = Math.cos(ang) * thetaRadius;
        thetaPts.push(
          new THREE.Vector3(r_xy * Math.cos(p.phi), r_xy * Math.sin(p.phi), z_local)
        );
      }
      p.visuals.thetaArc.geometry.setFromPoints(thetaPts);
    }

    function updateGreatCircle() {
      if (!isPoint2Enabled || !isGreatCircleEnabled) {
        greatCircle.visible = false;
        return;
      }

      const v1 = points[0].vec;
      const v2 = points[1].vec;

      const n = new THREE.Vector3().crossVectors(v1, v2).normalize();

      if (n.lengthSq() < 0.001) {
        greatCircle.visible = false;
        return;
      }

      greatCircle.visible = true;

      const targetQ = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        n
      );
      greatCircle.setRotationFromQuaternion(targetQ);
    }

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    const handleResize = () => {
      resize2d();
      points.forEach((p) => updatePointFromUV(p.id, p.u, p.v));

      if (container3d.clientWidth > 0 && container3d.clientHeight > 0) {
        camera.aspect = container3d.clientWidth / container3d.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container3d.clientWidth, container3d.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    resize2d();
    const r1 = canvasState.maxRadiusPx * 0.5;
    const ang1 = Math.PI / 4;
    const u1 = canvasState.cx + r1 * Math.cos(ang1);
    const v1 = canvasState.cy - r1 * Math.sin(ang1);

    const r2 = canvasState.maxRadiusPx * 0.7;
    const ang2 = Math.PI * 0.75;
    const u2 = canvasState.cx + r2 * Math.cos(ang2);
    const v2 = canvasState.cy - r2 * Math.sin(ang2);

    updatePointFromUV(0, u1, v1);
    updatePointFromUV(1, u2, v2);

    updateUI();
    animate();

    return () => {
      canvas2d.removeEventListener('mousedown', mouseDown);
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('mouseup', mouseUp);
      canvas2d.removeEventListener('touchstart', touchStart);
      window.removeEventListener('touchmove', touchMove);
      window.removeEventListener('touchend', touchEnd);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      container3d.removeChild(renderer.domElement);
    };
  }, [isPoint2Enabled, isGreatCircleEnabled, isUiVisible, activePointIdx]);

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row relative bg-gray-900 text-white">
      <button
        onClick={() => setIsUiVisible(!isUiVisible)}
        className="absolute top-4 right-4 z-50 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded shadow border border-gray-500 text-sm"
      >
        UI表示切替
      </button>

      <div
        className={`absolute top-16 right-4 z-40 bg-gray-800/90 p-3 rounded border border-gray-600 text-sm shadow-lg w-56 transition-opacity duration-300 ${
          !isUiVisible ? 'opacity-0 pointer-events-none' : ''
        }`}
      >
        <div className="font-bold border-b border-gray-600 mb-2 pb-1 text-gray-300">
          オプション
        </div>

        <label className="flex items-center space-x-2 mb-2 cursor-pointer hover:text-blue-300">
          <input
            type="checkbox"
            checked={isPoint2Enabled}
            onChange={(e) => {
              setIsPoint2Enabled(e.target.checked);
              if (!e.target.checked && activePointIdx === 1) {
                setActivePointIdx(0);
              }
            }}
            className="accent-blue-500"
          />
          <span>Point 2 を有効化</span>
        </label>

        <label
          className={`flex items-center space-x-2 cursor-pointer hover:text-yellow-300 transition-colors ${
            !isPoint2Enabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <input
            type="checkbox"
            checked={isGreatCircleEnabled}
            disabled={!isPoint2Enabled}
            onChange={(e) => setIsGreatCircleEnabled(e.target.checked)}
            className="accent-blue-500"
          />
          <span>2点を通る大円を描画</span>
        </label>
        <div className="text-xs text-gray-500 mt-1 pl-6">※球面上の最短経路を含む円</div>
      </div>

      <div className="relative w-full md:w-1/2 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-gray-600 flex flex-col">
        <div
          className={`absolute top-2 left-2 z-10 bg-black/70 p-2 rounded text-sm pointer-events-none select-none transition-opacity duration-300 ${
            !isUiVisible ? 'opacity-0' : ''
          }`}
        >
          <h2 className="font-bold text-blue-400">画像平面 (Image Plane)</h2>
          <p className="text-xs text-gray-300">点に近い場所をドラッグして移動</p>
          <p className="text-xs text-gray-400 mt-1">
            中心 (c<sub>x</sub>, c<sub>y</sub>) からの距離 ∝ θ
          </p>
          <p className="text-xs text-gray-400">
            最大角度 θ<sub>max</sub> = 90°
          </p>
        </div>
        <canvas ref={canvas2dRef} className="w-full h-full bg-gray-900 cursor-crosshair" />

        <div
          className={`absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur p-2 rounded text-xs md:text-sm select-none pointer-events-none flex gap-4 justify-between transition-opacity duration-300 ${
            !isUiVisible ? 'opacity-0' : ''
          }`}
        >
          <div className="flex-1 text-blue-300">
            <div className="font-bold border-b border-blue-500/50 mb-1">Point 1 (Blue)</div>
            <div className="grid grid-cols-2 gap-x-2">
              <div>
                φ: <span className="font-mono text-white">{p1Stats.phi}</span>°
              </div>
              <div>
                θ: <span className="font-mono text-white">{p1Stats.theta}</span>°
              </div>
            </div>
          </div>
          <div
            className="flex-1 text-fuchsia-300"
            style={{ visibility: isPoint2Enabled ? 'visible' : 'hidden' }}
          >
            <div className="font-bold border-b border-fuchsia-500/50 mb-1">Point 2 (Magenta)</div>
            <div className="grid grid-cols-2 gap-x-2">
              <div>
                φ: <span className="font-mono text-white">{p2Stats.phi}</span>°
              </div>
              <div>
                θ: <span className="font-mono text-white">{p2Stats.theta}</span>°
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative w-full md:w-1/2 h-1/2 md:h-full bg-black flex flex-col">
        <div
          className={`absolute top-2 left-2 z-10 bg-black/70 p-2 rounded text-sm pointer-events-none select-none transition-opacity duration-300 ${
            !isUiVisible ? 'opacity-0' : ''
          }`}
        >
          <h2 className="font-bold text-green-400">単位半球 (Unit Hemisphere)</h2>
          <p className="text-xs text-gray-300">
            ベクトル <span className="italic">v</span> = (x, y, z)
            <sup>⊤</sup>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            <span className="text-red-400">赤線: θ</span> /{' '}
            <span className="text-green-400">緑線: φ</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">※ドラッグでカメラ回転</p>
        </div>
        <div ref={container3dRef} className="w-full flex-grow relative overflow-hidden" />

        <div
          className={`absolute bottom-0 w-full bg-black/60 backdrop-blur p-3 text-xs md:text-sm border-t border-gray-600 max-h-40 overflow-y-auto transition-opacity duration-300 ${
            !isUiVisible ? 'opacity-0' : ''
          }`}
        >
          <div className="mb-2 font-bold text-center border-b border-gray-600 pb-1 select-none flex justify-between px-2">
            <span>
              Active Point:{' '}
              <span className={`${mathData.colorClass} font-bold`}>{mathData.name}</span>
            </span>
            <span className="opacity-50 tracking-wider">
              <span className="italic">v</span> = [sinθcosφ, sinθsinφ, cosθ]
              <sup>⊤</sup>
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 font-mono select-text">
            <div className="flex items-center">
              <span className="w-8 text-red-400 font-bold">x</span> = sin(
              <span className="text-red-300">{mathData.theta}</span>) × cos(
              <span className="text-green-300">{mathData.phi}</span>) ={' '}
              <span className="text-gray-400 ml-1">{mathData.sinTheta}</span> ×{' '}
              <span className="text-gray-400">{mathData.cosPhi}</span>
              <span className="ml-auto font-bold text-white">= {mathData.x}</span>
            </div>
            <div className="flex items-center">
              <span className="w-8 text-green-400 font-bold">y</span> = sin(
              <span className="text-red-300">{mathData.theta}</span>) × sin(
              <span className="text-green-300">{mathData.phi}</span>) ={' '}
              <span className="text-gray-400 ml-1">{mathData.sinTheta}</span> ×{' '}
              <span className="text-gray-400">{mathData.sinPhi}</span>
              <span className="ml-auto font-bold text-white">= {mathData.y}</span>
            </div>
            <div className="flex items-center">
              <span className="w-8 text-blue-400 font-bold">z</span> = cos(
              <span className="text-red-300">{mathData.theta}</span>)
              <span className="ml-auto font-bold text-white">= {mathData.z}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}