import type { APIRoute } from "astro";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Resend } from "resend";

const RESEND_API_KEY = "re_DbmXJPxF_6CqjDHHKRMpkgzc71gujzBU9";
const TO_EMAIL = "innbox.sv@gmail.com";
const FROM_EMAIL = "Prueba Objetiva <no-reply@codefactory.lat>";

const TECH_QUESTIONS = [
  {
    title: "Pregunta 1: IVA en El Salvador",
    body: "En El Salvador, el IVA se declara y paga generalmente de forma:",
    options: { a: "Trimestral", b: "Anual", c: "Mensual", d: "Semestral" }
  },
  {
    title: "Pregunta 2: Documentación Legal",
    body: "¿Cuál documento respalda legalmente una venta de bienes o servicios?",
    options: { a: "Cotización", b: "Factura o comprobante fiscal", c: "Orden de compra interna", d: "Recibo simple" }
  },
  {
    title: "Pregunta 3: Conciliación Bancaria",
    body: "Una conciliación bancaria sirve principalmente para:",
    options: { a: "Calcular impuestos", b: "Comparar los registros contables con el estado bancario", c: "Elaborar presupuestos", d: "Controlar inventarios" }
  },
  {
    title: "Pregunta 4: Cuentas por Pagar",
    body: "¿Cuál es una buena práctica en el control de cuentas por pagar?",
    options: { a: "Pagar sin revisar documentación", b: "Registrar pagos solo al final del mes", c: "Verificar factura, autorización y fecha de vencimiento", d: "Pagar únicamente cuando el proveedor insiste" }
  },
  {
    title: "Pregunta 5: Sistemas ERP",
    body: "En un entorno de trabajo con ERP, la principal ventaja es:",
    options: { a: "Eliminar la contabilidad", b: "Centralizar y automatizar la información", c: "Reducir responsabilidades", d: "Evitar controles internos" }
  },
  {
    title: "Pregunta 6: Retenciones de Renta",
    body: "Un consultor independiente emite factura por $2,500 por servicios profesionales. Como empresa contratante en El Salvador, debe aplicar:",
    options: { a: "No aplicar ninguna retención", b: "Retención del 10% sobre el monto neto ($250)", c: "Retención del 13% de IVA ($325)", d: "Retención del 10% sobre el monto con IVA incluido" }
  },
  {
    title: "Pregunta 7: Clasificación de Gastos",
    body: "El pago de $800 por alquiler mensual de oficina debe clasificarse contablemente como:",
    options: { a: "Activo corriente", b: "Gasto de administración u operación", c: "Pasivo corriente", d: "Costo de ventas" }
  },
  {
    title: "Pregunta 8: Control Presupuestario",
    body: "Tiene un proyecto con presupuesto de $50,000. A mitad de período ha ejecutado $32,000. ¿Qué porcentaje de ejecución tiene?",
    options: { a: "32%", b: "64%", c: "68%", d: "50%" }
  },
  {
    title: "Pregunta 9: Facturación con IVA",
    body: "Debe facturar servicios de consultoría por $4,000. ¿Cuál es el monto total a cobrar (incluyendo IVA 13%)?",
    options: { a: "$4,000", b: "$4,130", c: "$4,520", d: "$4,680" }
  },
  {
    title: "Pregunta 10: Organización Documental",
    body: "Para organizar 300 facturas de múltiples proveedores y proyectos en Google Drive, la estructura MÁS eficiente sería:",
    options: { a: "Una carpeta con todas las facturas ordenadas cronológicamente", b: "Carpetas por año > mes > proveedor", c: "Carpetas por proyecto > tipo de documento > período", d: "Carpetas por rango de monto" }
  }
] as const;

function normalizeSelectedCases(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  return [String(v)];
}

function val(data: any, k: string) {
  const x = data?.[k];
  if (x === null || x === undefined) return "";
  return String(x);
}

function wrapText(text: string, maxChars: number) {
  const words = (text || "").replace(/\r/g, "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function base64FromUint8(arr: Uint8Array) {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < arr.length; i += chunk) {
    s += String.fromCharCode(...arr.subarray(i, i + chunk));
  }
  return btoa(s);
}

function escapeHtml(s: string) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function p(text: string) {
  const t = escapeHtml(text || "");
  return `<div style="margin:0 0 10px 0; white-space:pre-wrap; line-height:1.45;">${t}</div>`;
}

function qa(title: string, question: string, answer: string) {
  const a = answer?.trim() ? answer.trim() : "(Sin respuesta)";
  return `
    <div style="border:1px solid #e5e7eb; border-radius:12px; padding:14px; margin:0 0 14px 0;">
      <div style="font-weight:700; font-size:14px; margin:0 0 8px 0;">${escapeHtml(title)}</div>
      <div style="background:#f9fafb; border:1px solid #eef2f7; border-radius:10px; padding:10px; margin:0 0 10px 0;">
        <div style="font-weight:600; margin:0 0 6px 0;">Pregunta</div>
        ${p(question)}
      </div>
      <div style="background:#ecfdf5; border:1px solid #bbf7d0; border-radius:10px; padding:10px;">
        <div style="font-weight:600; margin:0 0 6px 0;">Respuesta</div>
        ${p(a)}
      </div>
    </div>
  `;
}

function optionLabel(i0: number, key: string) {
  const q = TECH_QUESTIONS[i0];
  const k = (key || "").toLowerCase();
  const opt = (q?.options as any)?.[k];
  if (!k) return "(Sin selección)";
  return opt ? `${k}) ${opt}` : k;
}

function buildEmailHtml(data: any) {
  const casos = normalizeSelectedCases(data.caso_seleccionado);

  const header = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#111827;">
      <div style="max-width:820px; margin:0 auto; padding:18px;">
        <div style="border-radius:16px; padding:18px; background:#111827; color:#fff; margin-bottom:14px;">
          <div style="font-size:18px; font-weight:800;">PRUEBA OBJETIVA — RESPUESTAS</div>
          <div style="opacity:.9; margin-top:6px;">Nombre: ${escapeHtml(val(data, "nombre"))} · Email: ${escapeHtml(val(data, "email"))} · Tel: ${escapeHtml(val(data, "telefono"))}</div>
          <div style="opacity:.9; margin-top:4px;">Inicio: ${escapeHtml(val(data, "fecha_inicio"))}</div>
        </div>
  `;

  const sec = (title: string) => `
    <div style="margin:18px 0 10px 0; padding:10px 12px; border:1px solid #dbeafe; background:#eff6ff; border-radius:12px; font-weight:800; color:#1e3a8a;">
      ${escapeHtml(title)}
    </div>
  `;

  const caseBlock = (id: string, title: string, qs: { t: string; body: string; k: string }[]) => {
    if (!casos.includes(id)) return "";
    const items = qs.map((q) => qa(q.t, q.body, val(data, q.k))).join("");
    return `
      <div style="margin:0 0 18px 0;">
        <div style="font-weight:900; font-size:15px; color:#312e81; margin:0 0 10px 0;">
          ${escapeHtml(title)}
        </div>
        ${items}
      </div>
    `;
  };

  const sec1 =
    sec("SECCIÓN 1 — Casos Prácticos") +
    caseBlock("caso1", "CASO 1: Programa de Aceleración – Sector Agrícola", [
      { t: "1.1 Documentación y Control Inicial (33%)", body: "¿Qué documentos administrativos y contables mínimos organizaría desde el inicio del proyecto? Liste al menos 6 documentos clave y explique brevemente para qué sirve cada uno.", k: "caso1_p1" },
      { t: "1.2 Organización Digital (33%)", body: "Proponga una estructura de carpetas en la nube para este programa. Incluya: jerarquía de carpetas, nomenclatura de archivos y permisos de acceso.", k: "caso1_p2" },
      { t: "1.3 Control Presupuestario (34%)", body: "Explique cómo llevaría el control de egresos por startup para no exceder los montos asignados. Describa: herramientas, frecuencia de actualización, indicadores de alerta y cómo reportaría el status.", k: "caso1_p3" }
    ]) +
    caseBlock("caso2", "CASO 2: Programa de Capital Semilla – 25 MIPYMES", [
      { t: "2.1 Herramienta de Control (30%)", body: "¿Qué herramienta(s) utilizaría para el control administrativo y financiero? Justifique considerando: volumen, reportes, colaboración y costos.", k: "caso2_p1" },
      { t: "2.2 Diseño de Sistema de Control (40%)", body: "Diseñe una tabla de control maestro. Especifique: campos/columnas (mínimo 10), tipo de información y cómo usaría esta tabla para tomar decisiones.", k: "caso2_p2" },
      { t: "2.3 Gestión de Incumplimientos (30%)", body: "Mes 3, 8 mipymes (32%) no han entregado comprobantes vencidos hace 15 días. ¿Cómo actuaría? Acciones inmediatas, seguimiento, escalación y medidas preventivas.", k: "caso2_p3" }
    ]) +
    caseBlock("caso3", "CASO 3: Digitalización con ERP – 200 MIPYMES", [
      { t: "3.1 Identificación de Riesgos (30%)", body: "Mencione al menos 5 riesgos administrativos o contables. Para cada uno: descripción, impacto y medida preventiva.", k: "caso3_p1" },
      { t: "3.2 Información Crítica en el ERP (35%)", body: "¿Qué información debe registrarse obligatoriamente por cada mipyme? Liste al menos 8 tipos de información y justifique por qué cada una es crítica.", k: "caso3_p2" },
      { t: "3.3 Gestión del Tiempo y Prioridades (35%)", body: "Con 200 mipymes: a) ¿Cómo organizaría su tiempo? b) ¿Estrategia para no atrasarse? c) ¿Qué delegaría/automatizaría? d) ¿Cómo mediría su avance?", k: "caso3_p3" }
    ]);

  let sec2 = sec("SECCIÓN 2 — Conocimientos Técnicos");
  for (let i = 1; i <= 10; i++) {
    const q = TECH_QUESTIONS[i - 1];
    const chosenKey = val(data, `p${i}`);
    const just = val(data, `p${i}_just`);
    const qText =
      `${q.title}\n` +
      `${q.body}\n` +
      `a) ${q.options.a}\n` +
      `b) ${q.options.b}\n` +
      `c) ${q.options.c}\n` +
      `d) ${q.options.d}\n\n` +
      `Opción elegida: ${optionLabel(i - 1, chosenKey)}`;
    sec2 += qa(q.title, qText, just);
  }

  const sec3 =
    sec("SECCIÓN 3 — Caso Ético") +
    qa("3.1 Acción Inmediata (15%)", "¿Qué acción tomaría de inmediato al detectar esta situación? Pasos concretos en las próximas 2 horas.", val(data, "etica_p1")) +
    qa("3.2 Comunicación Profesional (20%)", "¿Cómo comunicaría este hallazgo al coordinador? Redacte textualmente (correo/mensaje).", val(data, "etica_p2")) +
    qa("3.3 Análisis de Riesgos (25%)", "¿Qué riesgos administrativos, contables, legales y éticos identifica? Liste al menos 5.", val(data, "etica_p3")) +
    qa("3.4 Propuesta de Solución (25%)", "¿Qué alternativa concreta propondría para no detener el proyecto ni el informe, manteniendo orden y cumplimiento?", val(data, "etica_p4")) +
    qa("3.5 Mejora de Procesos (15%)", "¿Qué mejora de proceso sugeriría para prevenirlo estructuralmente? Controles/sistemas/políticas.", val(data, "etica_p5"));

  const secAuto =
    sec("Autoevaluación (No puntuada)") +
    qa("Auto 1", "¿Qué sección le resultó más desafiante y por qué?", val(data, "auto_p1")) +
    qa("Auto 2", "¿Qué herramientas o conocimientos necesitaría desarrollar para este puesto?", val(data, "auto_p2")) +
    qa("Auto 3", "¿Qué valor diferencial aportaría en los primeros 90 días?", val(data, "auto_p3"));

  const footer = `
        <div style="margin-top:16px; padding-top:12px; border-top:1px solid #e5e7eb; color:#6b7280; font-size:12px;">
          Se adjunta también el PDF generado.
        </div>
      </div>
    </div>
  `;

  return header + sec1 + sec2 + sec3 + secAuto + footer;
}

async function buildExamPdf(data: any) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  const pageW = 595.28;
  const pageH = 841.89;
  const lineH = 14;

  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - margin;

  const drawText = (t: string, size = 11, bold = false, color = rgb(0.1, 0.1, 0.1)) => {
    page.drawText(t, { x: margin, y, size, font: bold ? fontBold : font, color });
    y -= size + 6;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdf.addPage([pageW, pageH]);
      y = pageH - margin;
    }
  };

  const drawSection = (title: string) => {
    ensureSpace(40);
    page.drawRectangle({
      x: margin,
      y: y - 22,
      width: pageW - margin * 2,
      height: 26,
      color: rgb(0.92, 0.92, 0.97),
      borderColor: rgb(0.75, 0.75, 0.9),
      borderWidth: 1
    });
    page.drawText(title, { x: margin + 10, y: y - 16, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.45) });
    y -= 34;
  };

  const drawQA = (qTitle: string, qBody: string, answer: string) => {
    const maxChars = 95;
    const qLines = wrapText(qBody, maxChars);
    const aLines = wrapText(answer || "(Sin respuesta)", maxChars);

    const qBlockH = 18 + qLines.length * lineH;
    const total = 18 + qBlockH + 10 + (22 + aLines.length * lineH) + 10;

    ensureSpace(total);

    page.drawText(qTitle, { x: margin, y, size: 12, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
    y -= 18;

    page.drawRectangle({
      x: margin,
      y: y - (qLines.length * lineH + 10),
      width: pageW - margin * 2,
      height: qLines.length * lineH + 14,
      color: rgb(0.98, 0.98, 0.98),
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 1
    });

    let qy = y - 14;
    for (const ln of qLines) {
      page.drawText(ln, { x: margin + 10, y: qy, size: 10, font, color: rgb(0.25, 0.25, 0.25) });
      qy -= lineH;
    }
    y = y - (qLines.length * lineH + 24);

    page.drawText("Respuesta:", { x: margin, y, size: 11, font: fontBold, color: rgb(0.1, 0.35, 0.2) });
    y -= 16;

    page.drawRectangle({
      x: margin,
      y: y - (aLines.length * lineH + 14),
      width: pageW - margin * 2,
      height: aLines.length * lineH + 18,
      color: rgb(0.93, 0.98, 0.94),
      borderColor: rgb(0.55, 0.8, 0.6),
      borderWidth: 1
    });

    let ay = y - 14;
    for (const ln of aLines) {
      page.drawText(ln, { x: margin + 10, y: ay, size: 10.5, font, color: rgb(0.12, 0.12, 0.12) });
      ay -= lineH;
    }

    y = y - (aLines.length * lineH + 28);
  };

  const now = new Date().toISOString();

  drawText("PRUEBA OBJETIVA — RESPUESTAS", 16, true);
  drawText(`Enviado: ${now}`, 10, false, rgb(0.35, 0.35, 0.35));
  drawText(`Nombre: ${val(data, "nombre")}`, 11, true);
  drawText(`Email: ${val(data, "email")}`, 10);
  drawText(`Teléfono: ${val(data, "telefono")}`, 10);
  drawText(`Inicio: ${val(data, "fecha_inicio")}`, 10);
  y -= 10;

  const casos = normalizeSelectedCases(data.caso_seleccionado);

  drawSection("SECCIÓN 1 — Casos Prácticos");
  const caseBlock = (id: string, title: string, qs: { t: string; body: string; k: string }[]) => {
    if (!casos.includes(id)) return;
    drawText(title, 12, true, rgb(0.2, 0.2, 0.45));
    y -= 6;
    for (const q of qs) drawQA(q.t, q.body, val(data, q.k));
    y -= 8;
  };

  caseBlock("caso1", "CASO 1: Programa de Aceleración – Sector Agrícola", [
    { t: "1.1 Documentación y Control Inicial (33%)", body: "¿Qué documentos administrativos y contables mínimos organizaría desde el inicio del proyecto? Liste al menos 6 documentos clave y explique brevemente para qué sirve cada uno.", k: "caso1_p1" },
    { t: "1.2 Organización Digital (33%)", body: "Proponga una estructura de carpetas en la nube para este programa. Incluya: jerarquía de carpetas, nomenclatura de archivos y permisos de acceso.", k: "caso1_p2" },
    { t: "1.3 Control Presupuestario (34%)", body: "Explique cómo llevaría el control de egresos por startup para no exceder los montos asignados. Describa: herramientas, frecuencia de actualización, indicadores de alerta y cómo reportaría el status.", k: "caso1_p3" }
  ]);

  caseBlock("caso2", "CASO 2: Programa de Capital Semilla – 25 MIPYMES", [
    { t: "2.1 Herramienta de Control (30%)", body: "¿Qué herramienta(s) utilizaría para el control administrativo y financiero? Justifique considerando: volumen, reportes, colaboración y costos.", k: "caso2_p1" },
    { t: "2.2 Diseño de Sistema de Control (40%)", body: "Diseñe una tabla de control maestro. Especifique: campos/columnas (mínimo 10), tipo de información y cómo usaría esta tabla para tomar decisiones.", k: "caso2_p2" },
    { t: "2.3 Gestión de Incumplimientos (30%)", body: "Mes 3, 8 mipymes (32%) no han entregado comprobantes vencidos hace 15 días. ¿Cómo actuaría? Acciones inmediatas, seguimiento, escalación y medidas preventivas.", k: "caso2_p3" }
  ]);

  caseBlock("caso3", "CASO 3: Digitalización con ERP – 200 MIPYMES", [
    { t: "3.1 Identificación de Riesgos (30%)", body: "Mencione al menos 5 riesgos administrativos o contables. Para cada uno: descripción, impacto y medida preventiva.", k: "caso3_p1" },
    { t: "3.2 Información Crítica en el ERP (35%)", body: "¿Qué información debe registrarse obligatoriamente por cada mipyme? Liste al menos 8 tipos de información y justifique por qué cada una es crítica.", k: "caso3_p2" },
    { t: "3.3 Gestión del Tiempo y Prioridades (35%)", body: "Con 200 mipymes: a) ¿Cómo organizaría su tiempo? b) ¿Estrategia para no atrasarse? c) ¿Qué delegaría/automatizaría? d) ¿Cómo mediría su avance?", k: "caso3_p3" }
  ]);

  drawSection("SECCIÓN 2 — Conocimientos Técnicos");
  for (let i = 1; i <= 10; i++) {
    const q = TECH_QUESTIONS[i - 1];
    const chosenKey = val(data, `p${i}`);
    const just = val(data, `p${i}_just`);
    const body =
      `${q.title}\n` +
      `${q.body}\n` +
      `a) ${q.options.a}\n` +
      `b) ${q.options.b}\n` +
      `c) ${q.options.c}\n` +
      `d) ${q.options.d}\n\n` +
      `Opción elegida: ${optionLabel(i - 1, chosenKey)}`;
    drawQA(q.title, body, just);
  }

  drawSection("SECCIÓN 3 — Caso Ético");
  drawQA("3.1 Acción Inmediata (15%)", "¿Qué acción tomaría de inmediato al detectar esta situación? Pasos concretos en las próximas 2 horas.", val(data, "etica_p1"));
  drawQA("3.2 Comunicación Profesional (20%)", "¿Cómo comunicaría este hallazgo al coordinador? Redacte textualmente (correo/mensaje).", val(data, "etica_p2"));
  drawQA("3.3 Análisis de Riesgos (25%)", "¿Qué riesgos administrativos, contables, legales y éticos identifica? Liste al menos 5.", val(data, "etica_p3"));
  drawQA("3.4 Propuesta de Solución (25%)", "¿Qué alternativa concreta propondría para no detener el proyecto ni el informe, manteniendo orden y cumplimiento?", val(data, "etica_p4"));
  drawQA("3.5 Mejora de Procesos (15%)", "¿Qué mejora de proceso sugeriría para prevenirlo estructuralmente? Controles/sistemas/políticas.", val(data, "etica_p5"));

  drawSection("Autoevaluación (No puntuada)");
  drawQA("Auto 1", "¿Qué sección le resultó más desafiante y por qué?", val(data, "auto_p1"));
  drawQA("Auto 2", "¿Qué herramientas o conocimientos necesitaría desarrollar para este puesto?", val(data, "auto_p2"));
  drawQA("Auto 3", "¿Qué valor diferencial aportaría en los primeros 90 días?", val(data, "auto_p3"));

  const bytes = await pdf.save();
  return new Uint8Array(bytes);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    const checked = normalizeSelectedCases(data.caso_seleccionado);
    if (checked.length !== 2) {
      return new Response(JSON.stringify({ message: "Debe seleccionar exactamente 2 casos." }), { status: 400 });
    }

    const pdfBytes = await buildExamPdf(data);
    const filename = `prueba-objetiva-${(val(data, "nombre") || "candidato").replace(/\s+/g, "_")}.pdf`;
    const subject = `Prueba Objetiva — ${val(data, "nombre") || "Candidato"} — ${val(data, "email") || ""}`;
    const html = buildEmailHtml(data);

    const resend = new Resend(RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      subject,
      html,
      attachments: [
        {
          filename,
          content: base64FromUint8(pdfBytes)
        }
      ]
    });

    if (error) {
      return new Response(JSON.stringify({ message: `Resend error: ${error.message}` }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ message: err?.message || "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
