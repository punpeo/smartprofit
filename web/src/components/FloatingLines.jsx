import { useEffect, useRef } from 'react';
import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer
} from 'three';
import './FloatingLines.css';

const vertexShader = `
precision highp float;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
precision highp float;
uniform float iTime;
uniform vec3  iResolution;
uniform float animationSpeed;

uniform bool enableTop;
uniform bool enableMiddle;
uniform bool enableBottom;

uniform int topLineCount;
uniform int middleLineCount;
uniform int bottomLineCount;

uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;

uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;

uniform vec2 iMouse;
uniform bool interactive;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;

uniform bool parallax;
uniform float parallaxStrength;
uniform vec2 parallaxOffset;

uniform vec3 lineGradient[8];
uniform int lineGradientCount;

mat2 rotate(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

vec3 getLineColor(float t, vec3 fallback) {
  if (lineGradientCount <= 0) return fallback;
  if (lineGradientCount == 1) return lineGradient[0];
  float clamped = clamp(t, 0.0, 0.9999);
  float scaled = clamped * float(lineGradientCount - 1);
  int idx = int(floor(scaled));
  float f = fract(scaled);
  int idx2 = min(idx + 1, lineGradientCount - 1);
  return mix(lineGradient[idx], lineGradient[idx2], f) * 0.5;
}

float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
  float t = iTime * animationSpeed;
  float xOff = offset + t * 0.1;
  float amp = sin(offset + t * 0.2) * 0.3;
  float y = sin(uv.x + xOff) * amp;
  if (shouldBend) {
    vec2 d = screenUv - mouseUv;
    float influence = exp(-dot(d, d) * bendRadius);
    float bendOffset = (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
    y += bendOffset;
  }
  float m = uv.y - y;
  return 0.0175 / max(abs(m) + 0.01, 1e-3) + 0.01;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  uv.y *= -1.0;
  if (parallax) uv += parallaxOffset;

  vec3 col = vec3(0.0);
  vec2 mouseUv = interactive ? (2.0 * iMouse - iResolution.xy) / iResolution.y * vec2(1.0, -1.0) : vec2(-999.0);

  float angle;
  vec2 ruv;

  if (enableBottom) {
    for (int i = 0; i < bottomLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(bottomLineCount - 1), 1.0);
      angle = bottomWavePosition.z * log(length(uv) + 1.0);
      ruv = uv * rotate(angle);
      col += getLineColor(t, col) * wave(ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y), 1.5 + 0.2 * fi, uv, mouseUv, interactive) * 0.2;
    }
  }
  if (enableMiddle) {
    for (int i = 0; i < middleLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(middleLineCount - 1), 1.0);
      angle = middleWavePosition.z * log(length(uv) + 1.0);
      ruv = uv * rotate(angle);
      col += getLineColor(t, col) * wave(ruv + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y), 2.0 + 0.15 * fi, uv, mouseUv, interactive);
    }
  }
  if (enableTop) {
    for (int i = 0; i < topLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(topLineCount - 1), 1.0);
      angle = topWavePosition.z * log(length(uv) + 1.0);
      ruv = uv * rotate(angle);
      ruv.x *= -1.0;
      col += getLineColor(t, col) * wave(ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y), 1.0 + 0.2 * fi, uv, mouseUv, interactive) * 0.1;
    }
  }
  fragColor = vec4(col, 1.0);
}

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}`;

const MAX_GRADIENT_STOPS = 8;

function hexToVec3(hex) {
  let v = hex.trim().replace(/^#/, '');
  if (v.length === 3) v = v[0]+v[0]+v[1]+v[1]+v[2]+v[2];
  const r = parseInt(v.slice(0,2), 16) || 255;
  const g = parseInt(v.slice(2,4), 16) || 255;
  const b = parseInt(v.slice(4,6), 16) || 255;
  return new Vector3(r / 255, g / 255, b / 255);
}

export default function FloatingLines({
  linesGradient,
  enabledWaves = ['top', 'middle', 'bottom'],
  lineCount = [6],
  lineDistance = [5],
  topWavePosition,
  middleWavePosition,
  bottomWavePosition = { x: 2.0, y: -0.7, rotate: -1 },
  animationSpeed = 1,
  interactive = true,
  bendRadius = 5.0,
  bendStrength = -0.5,
  mouseDamping = 0.05,
  parallax = true,
  parallaxStrength = 0.2,
  mixBlendMode = 'screen',
  className = '',
}) {
  const containerRef = useRef(null);
  const targetMouse = useRef(new Vector2(-1000, -1000));
  const currentMouse = useRef(new Vector2(-1000, -1000));
  const targetInfluence = useRef(0);
  const currentInfluence = useRef(0);
  const targetParallax = useRef(new Vector2(0, 0));
  const currentParallax = useRef(new Vector2(0, 0));

  function getCount(wave) {
    if (typeof lineCount === 'number') return lineCount;
    const idx = enabledWaves.indexOf(wave);
    return idx >= 0 && idx < lineCount.length ? lineCount[idx] : 6;
  }
  function getDist(wave) {
    if (typeof lineDistance === 'number') return lineDistance * 0.01;
    const idx = enabledWaves.indexOf(wave);
    return (idx >= 0 && idx < lineDistance.length ? lineDistance[idx] : 5) * 0.01;
  }

  const topLC = enabledWaves.includes('top') ? getCount('top') : 0;
  const midLC = enabledWaves.includes('middle') ? getCount('middle') : 0;
  const botLC = enabledWaves.includes('bottom') ? getCount('bottom') : 0;
  const topLD = enabledWaves.includes('top') ? getDist('top') : 0.01;
  const midLD = enabledWaves.includes('middle') ? getDist('middle') : 0.01;
  const botLD = enabledWaves.includes('bottom') ? getDist('bottom') : 0.01;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let active = true;

    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    camera.position.z = 1;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new Vector3(1, 1, 1) },
      animationSpeed: { value: animationSpeed },
      enableTop: { value: enabledWaves.includes('top') },
      enableMiddle: { value: enabledWaves.includes('middle') },
      enableBottom: { value: enabledWaves.includes('bottom') },
      topLineCount: { value: topLC },
      middleLineCount: { value: midLC },
      bottomLineCount: { value: botLC },
      topLineDistance: { value: topLD },
      middleLineDistance: { value: midLD },
      bottomLineDistance: { value: botLD },
      topWavePosition: { value: new Vector3(topWavePosition?.x ?? 10, topWavePosition?.y ?? 0.5, topWavePosition?.rotate ?? -0.4) },
      middleWavePosition: { value: new Vector3(middleWavePosition?.x ?? 5, middleWavePosition?.y ?? 0, middleWavePosition?.rotate ?? 0.2) },
      bottomWavePosition: { value: new Vector3(bottomWavePosition?.x ?? 2, bottomWavePosition?.y ?? -0.7, bottomWavePosition?.rotate ?? 0.4) },
      iMouse: { value: new Vector2(-1000, -1000) },
      interactive: { value: interactive },
      bendRadius: { value: bendRadius },
      bendStrength: { value: bendStrength },
      bendInfluence: { value: 0 },
      parallax: { value: parallax },
      parallaxStrength: { value: parallaxStrength },
      parallaxOffset: { value: new Vector2(0, 0) },
      lineGradient: { value: Array.from({ length: MAX_GRADIENT_STOPS }, () => new Vector3(1, 1, 1)) },
      lineGradientCount: { value: 0 },
    };

    if (linesGradient?.length) {
      const stops = linesGradient.slice(0, MAX_GRADIENT_STOPS);
      uniforms.lineGradientCount.value = stops.length;
      stops.forEach((hex, i) => uniforms.lineGradient.value[i].copy(hexToVec3(hex)));
    }

    const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true });
    const geometry = new PlaneGeometry(2, 2);
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    let startTime = performance.now();

    function setSize() {
      if (!active) return;
      const w = container.clientWidth || 1, h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      uniforms.iResolution.value.set(renderer.domElement.width, renderer.domElement.height, 1);
    }
    setSize();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (active) setSize(); }) : null;
    if (ro) ro.observe(container);

    function onMove(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const dpr = renderer.getPixelRatio();
      targetMouse.current.set(x * dpr, (rect.height - y) * dpr);
      targetInfluence.current = 1;
      if (parallax) {
        targetParallax.current.set(
          (x / rect.width - 0.5) * 2 * parallaxStrength,
          -(y / rect.height - 0.5) * 2 * parallaxStrength,
        );
      }
    }
    function onLeave() { targetInfluence.current = 0; }

    if (interactive) {
      renderer.domElement.addEventListener('pointermove', onMove);
      renderer.domElement.addEventListener('pointerleave', onLeave);
    }

    let raf;
    function loop() {
      if (!active) return;
      uniforms.iTime.value = (performance.now() - startTime) / 1000;
      if (interactive) {
        currentMouse.current.lerp(targetMouse.current, mouseDamping);
        uniforms.iMouse.value.copy(currentMouse.current);
        currentInfluence.current += (targetInfluence.current - currentInfluence.current) * mouseDamping;
        uniforms.bendInfluence.value = currentInfluence.current;
      }
      if (parallax) {
        currentParallax.current.lerp(targetParallax.current, mouseDamping);
        uniforms.parallaxOffset.value.copy(currentParallax.current);
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      if (interactive) {
        renderer.domElement.removeEventListener('pointermove', onMove);
        renderer.domElement.removeEventListener('pointerleave', onLeave);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement);
    };
  }, [linesGradient, enabledWaves, lineCount, lineDistance, topWavePosition, middleWavePosition, bottomWavePosition, animationSpeed, interactive, bendRadius, bendStrength, mouseDamping, parallax, parallaxStrength, topLC, midLC, botLC, topLD, midLD, botLD]);

  return <div ref={containerRef} className={`floating-lines-container ${className}`} style={{ mixBlendMode }} />;
}
