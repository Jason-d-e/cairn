import { useEffect, useRef, useState } from 'react'

/*
 * The light (Refract, dial "water"): a net of caustics from a surface of moving water, generated live on a
 * small WebGL canvas. Written for Cairn: a domain-warped sine field, ridged, with a faint warm/cool split at the
 * brightest seams. A full pattern change takes about twelve seconds; it pauses off screen; under reduced motion
 * it draws one frame; without WebGL it falls back to a still shade. Colours are read from the CSS tokens.
 */

const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'
const FRAG = `precision mediump float;
uniform vec2 u_res; uniform float u_t;
uniform vec3 u_shade; uniform vec3 u_light; uniform vec3 u_warm; uniform vec3 u_cool;
float net(vec2 p, float t) {
  vec2 q = p;
  q += 0.30 * vec2(sin(q.y * 1.9 + t * 1.10), cos(q.x * 1.6 - t * 0.90));
  q += 0.20 * vec2(sin(q.y * 3.3 - t * 0.70 + 1.7), cos(q.x * 2.9 + t * 0.80 + 0.6));
  q += 0.12 * vec2(sin(q.y * 5.1 + t * 0.50 + 3.1), cos(q.x * 4.7 - t * 0.60 + 2.2));
  float v = sin(q.x * 2.3 + t * 0.40) * sin(q.y * 2.1 - t * 0.35);
  return pow(1.0 - abs(v), 6.0);
}
void main() {
  vec2 p = gl_FragCoord.xy / u_res.y * 2.4;
  float t = u_t * 0.5;
  float r = net(p, t);
  float rw = net(p + vec2(0.010, -0.006), t);
  float rc = net(p - vec2(0.008, 0.010), t);
  vec3 col = mix(u_shade, u_light, clamp(r * 1.2, 0.0, 1.0));
  col += u_warm * max(rw - r, 0.0) * 0.6;
  col += u_cool * max(rc - r, 0.0) * 0.6;
  gl_FragColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);
}`

/** "oklch(86% 0.05 212)" from a token → linear sRGB in 0..1, for the shader. */
function oklchToLinear(css: string): [number, number, number] {
  const m = css.match(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/)
  if (!m) return [0.6, 0.78, 0.86]
  const L = parseFloat(m[1]) / (m[2] ? 100 : 1)
  const C = parseFloat(m[3])
  const h = (parseFloat(m[4]) * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clamp = (x: number) => Math.min(1, Math.max(0, x))
  return [
    clamp(4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s),
  ]
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null
}

export default function Light({ className = 'hm-light' }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null)
  const [still, setStill] = useState(false)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const canvas = document.createElement('canvas')
    el.appendChild(canvas)
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power' })
    const vs = gl && compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = gl && compile(gl, gl.FRAGMENT_SHADER, FRAG)
    const program = gl && vs && fs ? gl.createProgram() : null
    if (!gl || !vs || !fs || !program) {
      el.removeChild(canvas)
      setStill(true)
      return
    }
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.useProgram(program)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const a = gl.getAttribLocation(program, 'a')
    gl.enableVertexAttribArray(a)
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0)

    const styles = getComputedStyle(el)
    const token = (name: string) => oklchToLinear(styles.getPropertyValue(name))
    gl.uniform3fv(gl.getUniformLocation(program, 'u_shade'), token('--color-shade'))
    gl.uniform3fv(gl.getUniformLocation(program, 'u_light'), token('--color-light'))
    gl.uniform3fv(gl.getUniformLocation(program, 'u_warm'), token('--spec-1'))
    gl.uniform3fv(gl.getUniformLocation(program, 'u_cool'), token('--spec-4'))
    const uRes = gl.getUniformLocation(program, 'u_res')
    const uT = gl.getUniformLocation(program, 'u_t')

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = performance.now()
    let raf = 0
    let visible = true

    const draw = (now: number) => {
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uT, (now - start) / 1000)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      if (!reduced && visible) raf = requestAnimationFrame(draw)
    }
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.max(1, Math.round(el.clientWidth * dpr))
      canvas.height = Math.max(1, Math.round(el.clientHeight * dpr))
      gl.viewport(0, 0, canvas.width, canvas.height)
      if (reduced || !visible) draw(performance.now())
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      cancelAnimationFrame(raf)
      if (visible && !reduced) raf = requestAnimationFrame(draw)
    })
    io.observe(el)
    resize()
    draw(performance.now())

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      if (canvas.parentNode === el) el.removeChild(canvas)
    }
  }, [])

  return (
    <div ref={host} className={className} aria-hidden>
      {still && <div className="hm-light-still" />}
    </div>
  )
}
