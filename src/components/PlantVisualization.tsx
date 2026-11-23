'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EquipmentItem } from '@/data/mock-data';
import { Box, Map as MapIcon, Eye, RotateCw } from 'lucide-react';

interface PlantVisualizationProps {
  equipment: EquipmentItem[];
  onSelectEquipment: (item: EquipmentItem) => void;
  isDark: boolean;
}

export function PlantVisualization({
  equipment,
  onSelectEquipment,
  isDark,
}: PlantVisualizationProps) {
  const [mode, setMode] = useState<'2d' | '3d'>('2d');
  const [selectedPipeItem, setSelectedPipeItem] = useState<EquipmentItem | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Агрегированный риск по технологическим узлам для 2D-карты
  const getUnitRisk = (unitName: string) => {
    const items = equipment.filter((e) => e.unit === unitName);
    if (items.some((i) => i.status === 'critical')) return 'critical';
    if (items.some((i) => i.status === 'warning')) return 'warning';
    return 'normal';
  };

  const getUnitColors = (risk: string) => {
    switch (risk) {
      case 'critical':
        return { fill: 'rgba(239, 68, 68, 0.16)', stroke: '#ef4444', text: '#f87171' };
      case 'warning':
        return { fill: 'rgba(245, 158, 11, 0.16)', stroke: '#f59e0b', text: '#fbbf24' };
      default:
        return { fill: 'rgba(16, 185, 129, 0.14)', stroke: '#10b981', text: '#34d399' };
    }
  };

  // Инициализация 3D-двойника на Three.js
  useEffect(() => {
    if (mode !== '3d' || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDark ? 0x0b1120 : 0xf1f5f9);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 7, 13);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(8, 12, 8);
    scene.add(dirLight);

    // Сетка основания
    const gridHelper = new THREE.GridHelper(
      18,
      18,
      isDark ? 0x334155 : 0xcbd5e1,
      isDark ? 0x1e293b : 0xe2e8f0
    );
    gridHelper.position.y = -1.5;
    scene.add(gridHelper);

    // Создаем группу трубопроводов и аппаратов, привязанных к equipment
    const plantGroup = new THREE.Group();
    const interactiveMeshes: THREE.Mesh[] = [];

    const statusColorMap: Record<EquipmentItem['status'], number> = {
      critical: 0xef4444,
      warning: 0xf59e0b,
      normal: 0x10b981,
    };

    equipment.forEach((item, idx) => {
      const xPos = (idx - (equipment.length - 1) / 2) * 2.1;
      const color = statusColorMap[item.status];
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.45,
      });

      let mesh: THREE.Mesh;
      if (item.type === 'pipeline') {
        // Горизонтальная/изогнутая труба
        const geom = new THREE.CylinderGeometry(0.28, 0.28, 3.6, 20);
        mesh = new THREE.Mesh(geom, material);
        mesh.rotation.z = Math.PI / 2;
        mesh.position.set(xPos, 0.3, (idx % 2 === 0 ? -1 : 1) * 1.4);
      } else if (item.type === 'vessel' || item.type === 'reactor') {
        // Вертикальная колонна / реактор
        const geom = new THREE.CylinderGeometry(0.55, 0.55, 2.8, 24);
        mesh = new THREE.Mesh(geom, material);
        mesh.position.set(xPos, 0, 0);
      } else {
        // Теплообменник
        const geom = new THREE.CylinderGeometry(0.45, 0.45, 2.2, 20);
        mesh = new THREE.Mesh(geom, material);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.set(xPos, -0.3, 0.8);
      }

      mesh.userData = { equipment: item };
      plantGroup.add(mesh);
      interactiveMeshes.push(mesh);
    });

    scene.add(plantGroup);

    // Raycaster для клика по трубе
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshes);
      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const eq = hit.userData.equipment as EquipmentItem;
        setSelectedPipeItem(eq);
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // Плавное вращение сцены
    let isDragging = false;
    let prevX = 0;
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      plantGroup.rotation.y += dx * 0.008;
      prevX = e.clientX;
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isDragging) {
        plantGroup.rotation.y += 0.0018;
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [mode, equipment, isDark]);

  const avtColors = getUnitColors(getUnitRisk('АВТ-3'));
  const lchColors = getUnitColors(getUnitRisk('ЛЧ-24/7'));
  const gfuColors = getUnitColors(getUnitRisk('ГФУ-2'));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Визуализация производства</h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Переключайтесь между 2D-картой технологических узлов и 3D-двойником трубопроводов
          </p>
        </div>
        <div
          className={`inline-flex rounded-lg p-1 border ${
            isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            onClick={() => setMode('2d')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              mode === '2d'
                ? 'bg-sky-500 text-white'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" /> 2D-карта установки
          </button>
          <button
            onClick={() => setMode('3d')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              mode === '3d'
                ? 'bg-sky-500 text-white'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Box className="w-3.5 h-3.5" /> 3D-двойник (Three.js)
          </button>
        </div>
      </div>

      {mode === '2d' ? (
        <div
          className={`relative rounded-2xl border p-4 overflow-hidden ${
            isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <svg viewBox="0 0 100 85" className="w-full h-[420px]">
            {/* Сетка фона */}
            <defs>
              <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path
                  d="M 5 0 L 0 0 0 5"
                  fill="none"
                  stroke={isDark ? '#1e293b' : '#e2e8f0'}
                  strokeWidth="0.2"
                />
              </pattern>
            </defs>
            <rect width="100" height="85" fill="url(#grid)" />

            {/* Технологический узел АВТ-3 */}
            <rect
              x="8"
              y="12"
              width="38"
              height="55"
              rx="3"
              fill={avtColors.fill}
              stroke={avtColors.stroke}
              strokeWidth="0.6"
            />
            <text x="11" y="18" fontSize="3.2" fontWeight="bold" fill={avtColors.text}>
              УЗЕЛ АВТ-3
            </text>

            {/* Технологический узел ЛЧ-24/7 */}
            <rect
              x="52"
              y="12"
              width="38"
              height="35"
              rx="3"
              fill={lchColors.fill}
              stroke={lchColors.stroke}
              strokeWidth="0.6"
            />
            <text x="55" y="18" fontSize="3.2" fontWeight="bold" fill={lchColors.text}>
              УЗЕЛ ЛЧ-24/7
            </text>

            {/* Технологический узел ГФУ-2 */}
            <rect
              x="44"
              y="52"
              width="46"
              height="28"
              rx="3"
              fill={gfuColors.fill}
              stroke={gfuColors.stroke}
              strokeWidth="0.6"
            />
            <text x="47" y="58" fontSize="3.2" fontWeight="bold" fill={gfuColors.text}>
              УЗЕЛ ГФУ-2
            </text>

            {/* Соединительные трубопроводы */}
            <path
              d="M 22 34 L 42 28 L 68 38 L 75 66"
              fill="none"
              stroke={isDark ? '#475569' : '#94a3b8'}
              strokeWidth="0.6"
              strokeDasharray="1.5 1"
            />

            {/* Точки оборудования */}
            {equipment.map((eq) => {
              const dotColor =
                eq.status === 'critical'
                  ? '#ef4444'
                  : eq.status === 'warning'
                  ? '#f59e0b'
                  : '#10b981';
              return (
                <g
                  key={eq.id}
                  className="cursor-pointer"
                  onClick={() => onSelectEquipment(eq)}
                >
                  <circle
                    cx={eq.mapCoords.x}
                    cy={eq.mapCoords.y}
                    r="2.6"
                    fill={dotColor}
                    stroke="#ffffff"
                    strokeWidth="0.6"
                  />
                  <text
                    x={eq.mapCoords.x}
                    y={eq.mapCoords.y - 3.6}
                    textAnchor="middle"
                    fontSize="2.5"
                    fontWeight="bold"
                    fill={isDark ? '#e2e8f0' : '#1e293b'}
                  >
                    {eq.tag}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <div
          className={`relative rounded-2xl border overflow-hidden ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <div ref={mountRef} className="w-full h-[440px] cursor-grab active:cursor-grabbing" />

          {/* Подсказка управления */}
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur text-white text-[11px] flex items-center gap-2 pointer-events-none">
            <RotateCw className="w-3.5 h-3.5" />
            Потяните мышью для вращения • Кликните по трубе/аппарату для замеров
          </div>

          {/* Всплывающая карточка при клике на 3D-объект */}
          {selectedPipeItem && (
            <div
              className={`absolute bottom-4 right-4 w-72 rounded-xl border p-4 shadow-xl backdrop-blur-md ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700 text-slate-100'
                  : 'bg-white/95 border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-400">
                  {selectedPipeItem.tag}
                </span>
                <button
                  onClick={() => setSelectedPipeItem(null)}
                  className="text-xs opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
              <div className="text-sm font-bold leading-snug mb-2">
                {selectedPipeItem.name}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div>
                  <span className="opacity-60">Текущая: </span>
                  <span className="font-mono font-bold">
                    {selectedPipeItem.currentThickness} мм
                  </span>
                </div>
                <div>
                  <span className="opacity-60">t_min: </span>
                  <span className="font-mono font-bold text-red-400">
                    {selectedPipeItem.minThickness} мм
                  </span>
                </div>
                <div>
                  <span className="opacity-60">Скорость: </span>
                  <span className="font-mono">{selectedPipeItem.corrosionRate} мм/г</span>
                </div>
                <div>
                  <span className="opacity-60">Механизм: </span>
                  <span>{selectedPipeItem.mechanism}</span>
                </div>
              </div>
              <button
                onClick={() => onSelectEquipment(selectedPipeItem)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> Открыть «Рентген» карточки
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
