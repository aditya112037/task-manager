import React, { useEffect, useMemo, useRef } from "react";
import { Color, Mesh, Program, Renderer, Triangle } from "ogl";
import gsap from "gsap";

const hexToRgb = (hex) => {
  const value = hex.replace("#", "");
  const normalized = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const parsed = Number.parseInt(normalized, 16);
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
};

const Aurora = ({
  colorStops = ["#7cff67", "#B19EEF", "#5227FF"],
  blend = 0.5,
  amplitude = 1.0,
  speed = 1,
}) => {
  const containerRef = useRef(null);
  const uniformsRef = useRef(null);

  const colors = useMemo(
    () => colorStops.slice(0, 3).concat(["#ffffff", "#ffffff", "#ffffff"]).slice(0, 3),
    [colorStops]
  );

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const vertex = `
      attribute vec2 uv;
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragment = `
      precision highp float;

      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uAmplitude;
      uniform float uBlend;
      uniform float uSpeed;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      varying vec2 vUv;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      float fbm(vec2 p) {
        float total = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 5; i++) {
          total += noise(p) * amp;
          p *= 2.0;
          amp *= 0.5;
        }
        return total;
      }

      void main() {
        vec2 uv = vUv;
        vec2 aspectUv = uv * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
        float t = uTime * (0.08 + 0.12 * uSpeed);

        float ridge = sin((aspectUv.x * 3.2 + t) + fbm(aspectUv * 2.8 + vec2(0.0, t * 0.6)) * (2.2 * uAmplitude));
        float wave = sin((aspectUv.x * 1.6 - t * 0.7) + fbm(aspectUv * 3.5 - vec2(0.0, t * 0.45)) * (1.6 * uAmplitude));
        float band = smoothstep(-0.7, 0.95, ridge * 0.62 + wave * 0.5);

        float nebula = fbm(aspectUv * 2.0 + vec2(t * 0.3, -t * 0.16));
        float aurora = smoothstep(0.2, 1.0, band + nebula * 0.75);
        float blendMix = clamp(0.2 + uBlend * 0.8, 0.0, 1.0);

        vec3 paletteA = mix(uColor1, uColor2, clamp(uv.x + nebula * 0.25, 0.0, 1.0));
        vec3 paletteB = mix(uColor2, uColor3, clamp(1.0 - uv.y + nebula * 0.15, 0.0, 1.0));
        vec3 color = mix(paletteA, paletteB, blendMix);

        float topFade = smoothstep(1.0, 0.18, uv.y);
        float glow = pow(max(aurora, 0.0), 1.45) * topFade;
        float alpha = clamp(glow * (0.5 + 0.45 * uBlend), 0.0, 0.92);

        gl_FragColor = vec4(color * glow, alpha);
      }
    `;

    const [c1, c2, c3] = colors.map((hex) => hexToRgb(hex));
    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: [window.innerWidth, window.innerHeight] },
      uAmplitude: { value: amplitude },
      uBlend: { value: blend },
      uSpeed: { value: speed },
      uColor1: { value: new Color(c1[0] / 255, c1[1] / 255, c1[2] / 255) },
      uColor2: { value: new Color(c2[0] / 255, c2[1] / 255, c2[2] / 255) },
      uColor3: { value: new Color(c3[0] / 255, c3[1] / 255, c3[2] / 255) },
    };
    uniformsRef.current = uniforms;

    const program = new Program(gl, { vertex, fragment, uniforms, transparent: true });
    const geometry = new Triangle(gl);
    const mesh = new Mesh(gl, { geometry, program });

    containerRef.current.appendChild(gl.canvas);

    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.uResolution.value = [window.innerWidth, window.innerHeight];
    };
    resize();
    window.addEventListener("resize", resize);

    let rafId = 0;
    const render = (time) => {
      uniforms.uTime.value = time * 0.001;
      renderer.render({ scene: mesh });
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      if (gl.canvas?.parentNode) gl.canvas.parentNode.removeChild(gl.canvas);
      try {
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      } catch {
        // no-op
      }
    };
  }, [colors, amplitude, blend, speed]);

  useEffect(() => {
    if (!uniformsRef.current) return;
    const uniforms = uniformsRef.current;
    gsap.to(uniforms.uAmplitude, { value: amplitude, duration: 0.8, ease: "power2.out" });
    gsap.to(uniforms.uBlend, { value: blend, duration: 0.8, ease: "power2.out" });
    gsap.to(uniforms.uSpeed, { value: speed, duration: 0.8, ease: "power2.out" });
  }, [amplitude, blend, speed]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    />
  );
};

export default Aurora;
