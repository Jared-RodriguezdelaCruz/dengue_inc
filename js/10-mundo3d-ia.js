"use strict";

// --- IA 3D -----------------------------------------------------------------
const tmpV = new THREE.Vector3();

function actualizarMosquitos3D(dt) {
    const cam = camera3D;
    for (let i = mosquitos3D.length - 1; i >= 0; i--) {
        const e = mosquitos3D[i];
        if (!e.vivo) { mosquitos3D.splice(i, 1); continue; }
        const p = e.malla.position;
        const d = p.distanceTo(cam.position);

        // Culling por distancia: fuera de la niebla ni se simula ni se dibuja.
        // Los dos radios van atados a scene.fog.far (130): si se recortan antes,
        // aparecen mosquitos de la nada a media sala.
        e.malla.visible = d < 118;
        if (d > 96) {
            if (e.token) { e.token = false; tokensAtaque = Math.max(0, tokensAtaque - 1); }
            continue;
        }
        entidadesActualizadas++;

        const a = e.arq;
        e.fase += dt * 0.3;
        if (e.flash > 0) e.flash -= dt;
        if (e.cd > 0) e.cd -= dt;

        // Aleteo: escala vertical de los planos de las alas.
        const al = Math.abs(Math.sin(e.fase * 9)) * 0.9 + 0.25;
        e.alaI.scale.y = al; e.alaD.scale.y = al;
        // Destello de golpe y parpadeo de telegrafía por emissive: con textura,
        // poner el color en blanco solo dejaba ver la textura sin teñir. Solo se
        // toca el material cuando el estado cambia, no en cada frame.
        const blanco = e.flash > 0 || (e.est === 'telegrafia' && Math.floor(e.cargaT / 3) % 2 === 0);
        if (blanco !== e.blanco) {
            e.blanco = blanco;
            e.malla.material.emissive.setHex(blanco ? 0xffffff : 0x000000);
        }

        if (e.aturdido > 0) {
            e.aturdido -= dt;
            e.vx *= Math.pow(0.9, dt); e.vz *= Math.pow(0.9, dt);
            p.x += e.vx * dt; p.z += e.vz * dt;
            p.y = lerp(p.y, 0.9, 0.05 * dt);
            e.malla.rotation.z += 0.14 * dt;
            if (Math.random() < 0.3) emitir3D(p.x, p.y + 0.7, p.z, 0, 0.01, 0, 20, 1, 0.85, 0.2, 0);
            if (e.aturdido <= 0) { e.est = 'persecucion'; e.malla.rotation.z = 0; e.cd = 30; }
            continue;
        }

        // Los radios del arquetipo están en píxeles 2D; /22 los pasa a unidades de mundo.
        const ve = d < a.vision / 22 && !jugador.muerto && visible3D(p.x, p.z, cam.position.x, cam.position.z);
        if (ve) { e.ultX = cam.position.x; e.ultZ = cam.position.z; e.memT = 150; }
        else if (e.memT > 0) e.memT -= dt;

        const vel = a.vel * 0.045;
        switch (e.est) {
        case 'patrulla':
            if (a.vel > 0) {
                e.vx = aprox(e.vx, Math.sin(e.fase * 0.6) * vel * 0.5, 0.006 * dt);
                e.vz = aprox(e.vz, Math.cos(e.fase * 0.45) * vel * 0.5, 0.006 * dt);
                p.y = lerp(p.y, e.hogar.y + Math.sin(e.fase * 1.3) * 0.4, 0.05 * dt);
            }
            if (ve) { e.est = 'alerta'; e.t = 22; tono(880, 0.06, 'square', 0.03); }
            break;
        case 'alerta':
            e.t -= dt;
            e.vx *= Math.pow(0.86, dt); e.vz *= Math.pow(0.86, dt);
            if (e.t <= 0) e.est = 'persecucion';
            break;
        case 'persecucion': {
            const tx = ve ? cam.position.x : e.ultX, tz = ve ? cam.position.z : e.ultZ;
            let ddx = tx - p.x, ddz = tz - p.z;
            const dd = Math.hypot(ddx, ddz) || 1;
            if (a.vel > 0) {
                let deX = ddx / dd, deZ = ddz / dd;
                if (a.distOrbita) {
                    const orb = a.distOrbita / 22;
                    if (dd < orb * 0.8) { deX *= -1; deZ *= -1; }
                    else if (dd < orb * 1.2) { const t = deX; deX = -deZ; deZ = t; }
                }
                e.vx = aprox(e.vx, deX * vel, 0.007 * dt);
                e.vz = aprox(e.vz, deZ * vel, 0.007 * dt);
                p.y = lerp(p.y, clamp(cam.position.y + 0.2, 1.0, 3.2), 0.03 * dt);
            }
            if (ve && d < a.rangoAtaque / 22 && e.cd <= 0 && pedirToken(e)) {
                e.est = 'telegrafia'; e.cargaT = a.carga; sfx.telegrafia();
            }
            if (!ve && e.memT <= 0) { e.est = 'patrulla'; e.hogar.copy(p); }
            break;
        }
        case 'telegrafia': {
            e.cargaT -= dt;
            e.vx *= Math.pow(0.88, dt); e.vz *= Math.pow(0.88, dt);
            const s = 1 + Math.sin(e.cargaT * 0.55) * 0.22;
            e.malla.scale.setScalar(s);
            if (Math.random() < 0.5) {
                const th = Math.random() * 6.283, r = 1.4;
                emitir3D(p.x + Math.cos(th) * r, p.y + rndRango(-.5,.5), p.z + Math.sin(th) * r,
                         -Math.cos(th) * 0.05, 0, -Math.sin(th) * 0.05, 14, 1, 0.8, 0.2, 0);
            }
            if (e.cargaT <= 0) { e.est = 'ataque'; e.t = a.dispara ? 12 : 22; iniciarAtaque3D(e); }
            break;
        }
        case 'ataque':
            e.t -= dt;
            e.malla.scale.setScalar(lerp(e.malla.scale.x, 1, 0.2 * dt));
            if (a.embiste) {
                p.x += e.vx * dt; p.z += e.vz * dt; p.y += e.vy * dt;
                emitir3D(p.x, p.y, p.z, 0, 0, 0, 12, 1, 0.4, 0.25, 0);
                if (parryAbierto() && d < 2.6) {
                    parryExitoso(0, 0); aturdirMosquitos3D(cam.position, 5.5); dañarMosquito3D(e, 2);
                } else if (d < 1.15 && !invulnerable()) picar(e.serotipo, 0, 0);
            }
            if (a.areaAtaque && parryAbierto() && d < 3.2) {
                parryExitoso(0, 0); aturdirMosquitos3D(cam.position, 6); dañarMosquito3D(e, 3); e.t = 0;
            }
            if (e.t <= 0) { e.est = 'reposicion'; e.t = 42; e.cd = a.cdAtaque;
                            if (e.token) { e.token = false; tokensAtaque = Math.max(0, tokensAtaque - 1); } }
            break;
        case 'reposicion': {
            e.t -= dt;
            const ddx = p.x - cam.position.x, ddz = p.z - cam.position.z;
            const dd = Math.hypot(ddx, ddz) || 1;
            if (a.vel > 0) {
                e.vx = aprox(e.vx, ddx / dd * vel * 0.9, 0.006 * dt);
                e.vz = aprox(e.vz, ddz / dd * vel * 0.9, 0.006 * dt);
            }
            if (e.t <= 0) e.est = 'persecucion';
            break;
        }
        }

        // Separación entre mosquitos (evita que se apilen en un mismo punto)
        if (a.radioSep > 0) {
            for (let j = 0; j < mosquitos3D.length; j++) {
                const o = mosquitos3D[j];
                if (o === e || !o.vivo) continue;
                const dx = p.x - o.malla.position.x, dz = p.z - o.malla.position.z;
                const dd2 = dx * dx + dz * dz;
                const rs = a.radioSep / 22;
                if (dd2 > 0.001 && dd2 < rs * rs) {
                    const dd = Math.sqrt(dd2);
                    e.vx += dx / dd * 0.004 * dt; e.vz += dz / dd * 0.004 * dt;
                }
            }
        }

        if (e.est !== 'ataque' || !a.embiste) {
            const nx = p.x + e.vx * dt, nz = p.z + e.vz * dt;
            if (!chocaCirculo(nx, p.z, 0.4)) p.x = nx; else e.vx = -e.vx;
            if (!chocaCirculo(p.x, nz, 0.4)) p.z = nz; else e.vz = -e.vz;
        }
        p.y = clamp(p.y, 0.65, ALTO_MURO - 0.7);

        // Contacto pasivo
        if (!a.embiste && d < 1.0 && !invulnerable()) picar(e.serotipo, 0, 0);

        // Siempre miran al jugador: se lee de inmediato hacia dónde atacan.
        e.malla.lookAt(cam.position.x, p.y, cam.position.z);
    }
}

function iniciarAtaque3D(e) {
    const a = e.arq, p = e.malla.position, cam = camera3D;
    const dx = cam.position.x - p.x, dy = cam.position.y - p.y, dz = cam.position.z - p.z;
    const d = Math.hypot(dx, dy, dz) || 1;
    if (a.embiste) {
        const v = a.vel * 0.14;
        e.vx = dx / d * v; e.vy = dy / d * v; e.vz = dz / d * v;
    }
    if (a.dispara) proyectilEnemigo3D(p.x, p.y, p.z, dx / d, dy / d, dz / d, e.serotipo);
    if (a.areaAtaque) explotar3D(p.x, p.y, p.z, 3.6, 1);
}

function aturdirMosquitos3D(centro, radio) {
    for (const e of mosquitos3D) {
        if (!e.vivo) continue;
        const p = e.malla.position;
        if (p.distanceTo(centro) < radio) {
            e.aturdido = CFG.parryAturde; e.est = 'aturdido';
            const dx = p.x - centro.x, dz = p.z - centro.z, d = Math.hypot(dx, dz) || 1;
            e.vx = dx / d * 0.12; e.vz = dz / d * 0.12;
            if (e.token) { e.token = false; tokensAtaque = Math.max(0, tokensAtaque - 1); }
        }
    }
}

function actualizarProyectiles3D(dt) {
    const cam = camera3D;
    for (let i = proy3D.length - 1; i >= 0; i--) {
        const p = proy3D[i];
        p.vida -= dt;
        p.vy += p.grav * dt;
        p.malla.position.x += p.vx * dt;
        p.malla.position.y += p.vy * dt;
        p.malla.position.z += p.vz * dt;
        const pos = p.malla.position;
        emitir3D(pos.x, pos.y, pos.z, 0, 0, 0, 10, p.col[0], p.col[1], p.col[2], 0);

        let muere = p.vida <= 0 || pos.y < 0.1 || pos.y > ALTO_MURO ||
                    solidoMundo(pos.x, pos.z);

        // Parry en 3D: el orbe morado es la señal de que se puede devolver.
        if (!muere && !p.delJugador && p.pareable && parryAbierto() &&
            pos.distanceTo(cam.position) < 3.2) {
            p.delJugador = true; p.pareable = false;
            p.daño *= 2; p.col = [1, 0.85, 0.2];
            p.malla.material.color.setHex(0xf1c40f);
            let mejor = null, mejorD = 1e9;
            for (const e of mosquitos3D) {
                if (!e.vivo) continue;
                const dd = e.malla.position.distanceTo(pos);
                if (dd < mejorD) { mejorD = dd; mejor = e; }
            }
            const v = Math.hypot(p.vx, p.vy, p.vz) * 2.2;
            if (mejor) {
                tmpV.copy(mejor.malla.position).sub(pos).normalize().multiplyScalar(v);
                p.vx = tmpV.x; p.vy = tmpV.y; p.vz = tmpV.z;
            } else { p.vx *= -2; p.vy *= -2; p.vz *= -2; }
            parryExitoso(0, 0);
            anillo3D(cam.position.x, cam.position.y, cam.position.z, 6, 0xf1c40f);
            aturdirMosquitos3D(cam.position, 6);
        }

        if (!muere) {
            if (p.delJugador) {
                for (const e of mosquitos3D) {
                    if (!e.vivo) continue;
                    if (e.malla.position.distanceTo(pos) < 0.9 + e.escala * 0.3) {
                        if (!p.explota) dañarMosquito3D(e, p.daño);
                        muere = true; break;
                    }
                }
            } else if (pos.distanceTo(cam.position) < 0.85 && !invulnerable()) {
                if (p.tipo === 'picadura') picar(p.serotipo, 0, 0);
                else dañarJugador(p.daño, 0, 0);
                muere = true;
            }
        }

        if (muere) {
            if (p.explota) {
                explotar3D(pos.x, pos.y, pos.z, p.explota, p.daño);
                if (p.delJugador && armaActiva === 'abate')
                    for (const c of criaderos3D)
                        if (!c.neutralizado &&
                            Math.hypot(c.x - pos.x, c.z - pos.z) < p.explota + 1.4)
                            aplicarAbate(c);
            }
            else fxChispas3D(pos.x, pos.y, pos.z, 8, p.col[0], p.col[1], p.col[2], 0.06);
            grupoNivel.remove(p.malla);
            p.malla.geometry.dispose(); p.malla.material.dispose();
            proy3D[i] = proy3D[proy3D.length - 1]; proy3D.pop();
        }
    }
}

let avisoGuero = 0;

function actualizarObjetos3D(dt) {
    const cam = camera3D, t = performance.now() * 0.001;
    if (avisoGuero > 0) avisoGuero -= dt;

    for (let i = monedas3D.length - 1; i >= 0; i--) {
        const m = monedas3D[i];
        m.rotation.y += 0.06 * dt;
        m.position.y = 1.1 + Math.sin(t * 2.4 + i) * 0.16;
        if (cam.position.distanceTo(m.position) < 1.7) {
            fxChispas3D(m.position.x, m.position.y, m.position.z, 14, 1, 0.85, 0.15, 0.07);
            grupoNivel.remove(m); m.geometry.dispose(); m.material.dispose();
            monedas3D.splice(i, 1);
            fichas++; actualizarHUD(); sfx.moneda();
        }
    }
    actualizarCriaderos3D(dt);
    for (const c of criaderos3D) {
        const seco = c.neutralizado || c.vaciado;
        if (c.agua) c.agua.visible = !seco;
        // Gris una sola vez al cerrarse (antes era un setHex en cada frame).
        if (c.neutralizado && !c.gris) {
            c.gris = true;
            for (const m of c.mats) m.color.setHex(GRIS_CERRADO);
        }
    }
    for (const ti of tinacos3D) {
        if (!ti.agua.visible) continue;
        ti.agua.position.y = ti.aguaY + Math.sin(t * 1.6 + ti.fase) * 0.012;
        ti.agua.material.opacity = 0.7 + Math.sin(t * 2.2 + ti.fase) * 0.12;
        if (Math.random() < 0.02)
            emitir3D(ti.malla.position.x + rndRango(-ti.r, ti.r) * 0.7, ti.aguaY + 0.08,
                     ti.malla.position.z + rndRango(-ti.r, ti.r) * 0.7,
                     0, 0.008, 0, 40, 0.2, 0.7, 0.75, 0.0004);
    }
    if (meta3D) {
        meta3D.rotation.y += 0.02 * dt;
        meta3D.material.color.setHex(metaAbierta ? 0x8e44ad : 0x4a4a4a);
        if (luzMeta) luzMeta.intensity = metaAbierta ? 2 + Math.sin(t * 3) * 0.8 : 0.2;
        if (metaAbierta) {
            if (Math.random() < 0.5)
                emitir3D(meta3D.position.x + rndRango(-1.4, 1.4), 0.3,
                         meta3D.position.z + rndRango(-.4,.4), 0, 0.03, 0, 40, 0.6, 0.25, 0.8, 0);
            // Con Güero sin resolver el portal es decorado: no se sale de aquí
            // dejándolo tirado, y el juego lo dice en vez de fallar en silencio.
            if (cam.position.distanceTo(meta3D.position) < 2.6) {
                if (gueroListo() && ivanListo()) completarNivel();
                else if (!avisoGuero) {
                    avisoGuero = 90;
                    aviso(ivanListo() ? 'NO TE VAS SIN GÜERO' : 'NO TE VAS SIN ATENDER A IVAN', 1800);
                }
            }
        }
    }
    actualizarAnillos(dt);
}

