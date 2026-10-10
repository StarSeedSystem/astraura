# CON1010 · Sincronía espaciada del backend de Astraura (2026-10-10) — SIN APLICAR

**Qué es.** Un parche (`con1010-sincronia-espaciada.patch`) para que el backend de Astraura de la Mac
deje de gastar la cuota diaria de Supabase del OS (25.000 peticiones). Medido el 10-10 en los registros
del proyecto, este backend (curl) hizo 6.462 peticiones en 20 h:

| Ruta | Antes (20 h) | Causa | Después (estimado/día) |
|---|---|---|---|
| POST `astraura_mesh_nodes` | 3.313 | `register_node` subía la fila del propio nodo en CADA latido local de 30 s, saltándose el tope de 60 s del 09-10 | ≈ 288 (cada 5 min) |
| GET `astraura_mesh_nodes` | 551 | descubrimiento cada 2 min | ≈ 288 (cada 5 min) |
| POST `astraura_state` | 1.464 | 5 secciones que cambian cada pocos minutos (enrutado, enjambre, notificaciones, bóveda, memoria) se subían en cada vuelta de 2 min | ≤ 480 (cada sección, como mucho cada 15 min) |
| GET `astraura_state?select=updated_at` | 1.133 | los cerebros preguntaban a la nube cada 2 min | ≈ 144 (cada 10 min; el escaneo LOCAL sigue cada 2) |

**Por qué no rompe nada.** Los pares de la malla siguen latiendo entre sí por HTTP cada 30 s;
Supabase solo sirve para descubrir nodos, y a un nodo visto por Supabase se le juzga con la vara de su
latido (no parece «caído» entre dos). Lo que espera turno se sube con su ÚLTIMO contenido; el botón de
sincronizar (`push_all(force=True)`) no espera. Todo se ajusta por entorno:
`ASTRAURA_MALLA_LATIDO_S` (300), `ASTRAURA_MALLA_DESCUBRIR_S` (300), `ASTRAURA_SYNC_MIN_S` (900),
`ASTRAURA_CEREBROS_SYNC_S` (600).

**Cómo se prueba (sin tocar el backend vivo).** `test_con1010.py` corre contra copias en un paquete
temporal con Supabase de mentira: 8 pruebas, en verde con el parche; con el código de hoy fallan 8
(2.880 subidas al día en vez de ≤ 288, 30 sincronías de cerebros por hora en vez de 6…).

**Cómo se aplica (cuando se decida, por el integrador):**
`cd "~/Documents/IA 1.58 bit" && git apply _starseed_consumo/con1010-sincronia-espaciada.patch`
y reiniciar el servicio del backend. No se publica nada solo.
