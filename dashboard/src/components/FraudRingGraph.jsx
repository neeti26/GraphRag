import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'

// Module-level flag: persists across tab switches without unmounting
let graphHasAnimated = false

const NODES = [
  { id:'0001', label:'Account\n#0001', type:'Account', status:'banned',    color:'#ff3b5c', size:30 },
  { id:'1002', label:'Account\n#1002', type:'Account', status:'flagged',   color:'#ff9f0a', size:28 },
  { id:'8821', label:'Account\n#8821', type:'Account', status:'target',    color:'#00b4d8', size:32 },
  { id:'5566', label:'Account\n#5566', type:'Account', status:'flagged',   color:'#ff9f0a', size:26 },
  { id:'3344', label:'Account\n#3344', type:'Account', status:'safe',      color:'#00e676', size:24 },
  { id:'XYZ-999',       label:'Device\nXYZ-999',       type:'Device',  color:'#bf5af2', size:26 },
  { id:'192.168.1.1',   label:'IP\n192.168.1.1',       type:'IP',      color:'#ff3b5c', size:24 },
  { id:'198.51.100.7',  label:'IP\n198.51.100.7',      type:'IP',      color:'#ff3b5c', size:22 },
  { id:'DEF-222',       label:'Device\nDEF-222',        type:'Device',  color:'#00e676', size:20 },
  { id:'10.0.0.55',     label:'IP\n10.0.0.55',          type:'IP',      color:'#00e676', size:20 },
]

const EDGES = [
  { from:'0001', to:'XYZ-999',      label:'USED_DEVICE',    ring:true },
  { from:'1002', to:'XYZ-999',      label:'USED_DEVICE',    ring:true },
  { from:'8821', to:'XYZ-999',      label:'USED_DEVICE',    ring:true },
  { from:'5566', to:'XYZ-999',      label:'USED_DEVICE',    ring:true },
  { from:'0001', to:'192.168.1.1',  label:'LOGGED_FROM_IP', ring:true },
  { from:'1002', to:'192.168.1.1',  label:'LOGGED_FROM_IP', ring:true },
  { from:'8821', to:'192.168.1.1',  label:'LOGGED_FROM_IP', ring:true },
  { from:'5566', to:'198.51.100.7', label:'LOGGED_FROM_IP', ring:true },
  { from:'3344', to:'DEF-222',      label:'USED_DEVICE',    ring:false },
  { from:'3344', to:'10.0.0.55',    label:'LOGGED_FROM_IP', ring:false },
]

function initPos(W, H) {
  const cx=W/2, cy=H/2
  const pos = {
    '0001':   { x:cx-180, y:cy-80 },
    '1002':   { x:cx-60,  y:cy-160 },
    '8821':   { x:cx+80,  y:cy-100 },
    '5566':   { x:cx+180, y:cy+40 },
    '3344':   { x:cx-220, y:cy+140 },
    'XYZ-999':      { x:cx,     y:cy-20 },
    '192.168.1.1':  { x:cx-100, y:cy+100 },
    '198.51.100.7': { x:cx+140, y:cy+120 },
    'DEF-222':      { x:cx-300, y:cy+80 },
    '10.0.0.55':    { x:cx-280, y:cy+180 },
  }
  return NODES.map(n => ({ ...n, ...pos[n.id], vx:0, vy:0, pinned:false }))
}

export default function FraudRingGraph({ records }) {
  const canvasRef = useRef(null)
  const nodesRef  = useRef(null)
  const rafRef    = useRef(null)
  const hovRef    = useRef(null)
  const particlesRef = useRef([])
  const frameRef  = useRef(0)
  const [hovered, setHovered] = useState(null)
  const [pinned, setPinned]   = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W=canvas.width, H=canvas.height
    if (!nodesRef.current) nodesRef.current = initPos(W, H)
    const nodes = nodesRef.current
    const getN = id => nodes.find(n=>n.id===id)

    // Animation state: track per-node animScale (0→1) for first-render expansion
    // animScale is stored on each node object; initialize only once per mount
    if (!graphHasAnimated) {
      nodes.forEach(n => { if (n.animScale === undefined) n.animScale = 0 })
    }

    const tick = () => {
      frameRef.current++
      const hov = hovRef.current

      // Spawn particles on ring edges
      if (frameRef.current % 30 === 0) {
        EDGES.filter(e=>e.ring).forEach(e => {
          const a=getN(e.from), b=getN(e.to)
          if (a&&b) particlesRef.current.push({ fx:a.x, fy:a.y, tx:b.x, ty:b.y, t:0, color:a.color })
        })
      }
      particlesRef.current = particlesRef.current.map(p=>({...p,t:p.t+0.02})).filter(p=>p.t<1)

      // Physics
      nodes.forEach(a => {
        if (a.pinned) return
        nodes.forEach(b => {
          if (a===b) return
          const dx=a.x-b.x, dy=a.y-b.y, dist=Math.sqrt(dx*dx+dy*dy)||1
          const f=6000/(dist*dist)
          a.vx+=(dx/dist)*f*0.01; a.vy+=(dy/dist)*f*0.01
        })
      })
      EDGES.forEach(e => {
        const a=getN(e.from), b=getN(e.to)
        if (!a||!b) return
        const dx=b.x-a.x, dy=b.y-a.y, dist=Math.sqrt(dx*dx+dy*dy)||1
        const target=e.ring?100:130, force=(dist-target)*0.025
        const fx=(dx/dist)*force, fy=(dy/dist)*force
        if (!a.pinned){a.vx+=fx;a.vy+=fy}
        if (!b.pinned){b.vx-=fx;b.vy-=fy}
      })
      nodes.forEach(n => {
        if (n.pinned) return
        n.vx+=(W/2-n.x)*0.003; n.vy+=(H/2-n.y)*0.003
        n.vx*=0.8; n.vy*=0.8
        n.x=Math.max(n.size+4,Math.min(W-n.size-4,n.x+n.vx))
        n.y=Math.max(n.size+4,Math.min(H-n.size-4,n.y+n.vy))
      })

      const ctx=canvas.getContext('2d')
      ctx.clearRect(0,0,W,H)

      // Draw ring cluster highlight
      const ringNodes = nodes.filter(n=>['0001','1002','8821','5566','XYZ-999','192.168.1.1'].includes(n.id))
      if (ringNodes.length) {
        const cx2=ringNodes.reduce((s,n)=>s+n.x,0)/ringNodes.length
        const cy2=ringNodes.reduce((s,n)=>s+n.y,0)/ringNodes.length
        const maxR=Math.max(...ringNodes.map(n=>Math.hypot(n.x-cx2,n.y-cy2)))+40
        const grd=ctx.createRadialGradient(cx2,cy2,0,cx2,cy2,maxR)
        grd.addColorStop(0,'rgba(255,59,92,0.06)')
        grd.addColorStop(1,'transparent')
        ctx.beginPath(); ctx.arc(cx2,cy2,maxR,0,Math.PI*2)
        ctx.fillStyle=grd; ctx.fill()
        ctx.beginPath(); ctx.arc(cx2,cy2,maxR,0,Math.PI*2)
        ctx.strokeStyle='rgba(255,59,92,0.15)'; ctx.lineWidth=1; ctx.setLineDash([6,4]); ctx.stroke(); ctx.setLineDash([])
        ctx.fillStyle='rgba(255,59,92,0.5)'; ctx.font='bold 10px Inter,sans-serif'; ctx.textAlign='center'
        ctx.fillText('FRAUD RING', cx2, cy2-maxR+14)
      }

      // Edges
      EDGES.forEach(e => {
        const a=getN(e.from), b=getN(e.to)
        if (!a||!b) return
        const isHov=hov&&(e.from===hov||e.to===hov)
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y)
        ctx.strokeStyle=e.ring?(isHov?'rgba(255,59,92,0.8)':'rgba(255,59,92,0.3)'):(isHov?'rgba(0,230,118,0.6)':'rgba(0,230,118,0.15)')
        ctx.lineWidth=e.ring?(isHov?2:1):(isHov?1.5:0.8); ctx.stroke()
        if (isHov) {
          const mx=(a.x+b.x)/2, my=(a.y+b.y)/2
          ctx.fillStyle='rgba(148,163,184,0.8)'; ctx.font='8px Inter,sans-serif'; ctx.textAlign='center'
          ctx.fillText(e.label,mx,my-7)
        }
      })

      // Particles
      particlesRef.current.forEach(p => {
        const x=p.fx+(p.tx-p.fx)*p.t, y=p.fy+(p.ty-p.fy)*p.t
        const alpha=Math.sin(p.t*Math.PI)
        ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2)
        ctx.fillStyle=p.color+Math.floor(alpha*200).toString(16).padStart(2,'0'); ctx.fill()
      })

      // Node-Expansion Animation: update animScale on first render
      if (!graphHasAnimated) {
        // 300ms animation duration at ~60fps ≈ 18 frames; 40ms stagger ≈ 2.4 frames per node
        const fps = 60
        const animDuration = 300  // ms
        const staggerMs = 40      // ms per node index
        const framesPerMs = fps / 1000
        let allDone = true
        nodes.forEach((n, i) => {
          const staggerFrames = i * staggerMs * framesPerMs
          const elapsed = (frameRef.current - staggerFrames) / (animDuration * framesPerMs)
          n.animScale = Math.min(1, Math.max(0, elapsed))
          if (n.animScale < 1) allDone = false
        })
        if (allDone) graphHasAnimated = true
      }

      // Nodes
      nodes.forEach(n => {
        const animScale = graphHasAnimated ? 1 : (n.animScale ?? 1)
        if (animScale <= 0) return  // skip rendering until stagger delay passes
        const isHov=n.id===hov, isPin=n.id===pinned, hi=isHov||isPin
        const r=(n.size+(hi?4:0))*animScale
        if (isPin) {
          const pulse=0.5+0.5*Math.sin(frameRef.current*0.07)
          ctx.beginPath(); ctx.arc(n.x,n.y,r+8+pulse*4,0,Math.PI*2)
          ctx.strokeStyle=n.color+'40'; ctx.lineWidth=1; ctx.stroke()
        }
        const grd=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,r*2.5)
        grd.addColorStop(0,n.color+(hi?'50':'20')); grd.addColorStop(1,'transparent')
        ctx.beginPath(); ctx.arc(n.x,n.y,r*2.5,0,Math.PI*2); ctx.fillStyle=grd; ctx.fill()
        ctx.beginPath(); ctx.arc(n.x,n.y,r,0,Math.PI*2)
        ctx.fillStyle=hi?n.color+'25':'rgba(7,21,37,0.9)'; ctx.fill()
        ctx.strokeStyle=n.color; ctx.lineWidth=hi?2.5:1.5; ctx.stroke()
        // Only render glyph text when animScale is large enough to be readable
        if (animScale > 0.3) {
          ctx.globalAlpha = Math.min(1, (animScale - 0.3) / 0.4)
          ctx.fillStyle=hi?n.color:n.color+'cc'
          ctx.font=`${hi?'bold ':''}${hi?9.5:8.5}px Inter,sans-serif`; ctx.textAlign='center'
          n.label.split('\n').forEach((w,i,arr)=>ctx.fillText(w,n.x,n.y+(i-(arr.length-1)/2)*11+1))
          if (n.status) {
            ctx.fillStyle='rgba(71,85,105,0.7)'; ctx.font='7px Inter,sans-serif'
            ctx.fillText(n.status.toUpperCase(),n.x,n.y+r+11)
          }
          ctx.globalAlpha = 1
        }
      })

      rafRef.current=requestAnimationFrame(tick)
    }
    rafRef.current=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(rafRef.current)
  }, [pinned])

  const getHit = useCallback(e => {
    const canvas=canvasRef.current; if (!canvas||!nodesRef.current) return null
    const rect=canvas.getBoundingClientRect()
    const mx=(e.clientX-rect.left)*(canvas.width/rect.width)
    const my=(e.clientY-rect.top)*(canvas.height/rect.height)
    return nodesRef.current.find(n=>Math.hypot(n.x-mx,n.y-my)<n.size+6)||null
  }, [])

  const handleMove = useCallback(e => { const h=getHit(e); hovRef.current=h?.id||null; setHovered(h?.id||null) }, [getHit])
  const handleClick = useCallback(e => {
    const h=getHit(e)
    if (h) {
      const np=h.id===pinned?null:h.id; setPinned(np)
      if (nodesRef.current) nodesRef.current.forEach(n=>n.pinned=n.id===np)
    }
  }, [getHit, pinned])

  const connEdges = (hovered||pinned) ? EDGES.filter(e=>e.from===(hovered||pinned)||e.to===(hovered||pinned)) : []

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:18 }}>
      <motion.div initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} transition={{ duration:0.5 }}
        className="card" style={{ padding:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>Synthetic Identity Fraud Ring</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
              {NODES.length} nodes · {EDGES.length} edges · Click to pin · Hover to inspect
            </div>
          </div>
          {pinned && (
            <motion.button initial={{ scale:0 }} animate={{ scale:1 }}
              onClick={()=>{setPinned(null);if(nodesRef.current)nodesRef.current.forEach(n=>n.pinned=false)}}
              style={{ padding:'4px 12px', borderRadius:8, fontSize:10, fontWeight:700, background:'rgba(255,59,92,0.15)', color:'var(--red)', border:'1px solid rgba(255,59,92,0.3)', cursor:'pointer', fontFamily:'var(--mono)' }}>
              ✕ Unpin
            </motion.button>
          )}
        </div>
        <canvas ref={canvasRef} width={900} height={500} onMouseMove={handleMove}
          onMouseLeave={()=>{hovRef.current=null;setHovered(null)}} onClick={handleClick}
          style={{ width:'100%', borderRadius:10, background:'var(--bg)', cursor:'crosshair' }} />
        {connEdges.length>0 && (
          <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
            style={{ marginTop:10, padding:'8px 14px', background:'rgba(255,59,92,0.05)', border:'1px solid rgba(255,59,92,0.2)', borderRadius:10, fontSize:11 }}>
            <span style={{ color:'var(--red2)', fontWeight:700, fontFamily:'var(--mono)' }}>{hovered||pinned}</span>
            <span style={{ color:'var(--text-muted)', margin:'0 8px' }}>·</span>
            {connEdges.map(e=>(
              <span key={e.from+e.to} style={{ marginRight:12, color:'var(--text-dim)' }}>
                {e.from===(hovered||pinned)?<><span style={{color:'var(--purple)'}}>→</span> {e.to}</>:<><span style={{color:'var(--cyan)'}}>←</span> {e.from}</>}
                <span style={{ color:'var(--text-muted)', fontSize:10 }}> ({e.label})</span>
              </span>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Sidebar */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.2 }} className="card" style={{ padding:16 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12, fontFamily:'var(--mono)' }}>Node Legend</div>
          {[['Account (banned)','var(--red)'],['Account (flagged)','var(--orange)'],['Account (target)','var(--cyan)'],['Account (safe)','var(--green)'],['Device (shared)','var(--purple)'],['IP (blacklisted)','var(--red)'],['IP (clean)','var(--green)']].map(([l,c])=>(
            <div key={l} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:c, boxShadow:`0 0 6px ${c}`, flexShrink:0 }} />
              <span style={{ fontSize:10, color:'var(--text-dim)' }}>{l}</span>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.3 }} className="card" style={{ padding:16 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12, fontFamily:'var(--mono)' }}>Ring Analysis</div>
          {[
            ['Ring Size','4 accounts','var(--red)'],
            ['Shared Device','XYZ-999','var(--purple)'],
            ['Blacklisted IPs','2','var(--red)'],
            ['WCC Cluster','1 ring','var(--orange)'],
            ['Max Hops','3','var(--cyan)'],
            ['PageRank (top)','#0001 (9.8)','var(--red)'],
          ].map(([l,v,c])=>(
            <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:9, paddingBottom:9, borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}>{l}</span>
              <span style={{ fontSize:12, color:c, fontWeight:700, fontFamily:'var(--mono)' }}>{v}</span>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.4 }} className="card" style={{ padding:16, borderTop:'2px solid var(--orange)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--orange)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:10, fontFamily:'var(--mono)' }}>⚠️ GSQL Algorithms Used</div>
          {[['WCC','Identifies fraud ring clusters'],['PageRank','Ranks most influential nodes'],['ShortestPath','Finds connection between accounts'],['3-hop BFS','Traverses fraud network']].map(([algo,desc])=>(
            <div key={algo} style={{ marginBottom:8, padding:'7px 10px', background:'rgba(255,184,0,0.06)', borderRadius:7, border:'1px solid rgba(255,184,0,0.15)' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--yellow)', fontFamily:'var(--mono)' }}>{algo}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{desc}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
