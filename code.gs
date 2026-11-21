/**
 * API DE CONEXIÓN (Code.gs) - Versión Final Corregida
 */

// ==========================================
// 1. FUNCIONES DE BÚSQUEDA Y ESCRITURA
// ==========================================

function buscarParte(query) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetIndice = ss.getSheetByName("IndiceParte");
  const sheetNotas = ss.getSheetByName("NotaReferencia");
  const sheetPrecios = ss.getSheetByName("PrecioReferencia");
  const sheetVersiones = ss.getSheetByName("VersionCatalogo");

  const dataIndice = sheetIndice.getDataRange().getValues();
  const dataNotas = sheetNotas.getDataRange().getValues();
  const dataPrecios = sheetPrecios.getDataRange().getValues();
  const dataVersiones = sheetVersiones.getDataRange().getValues();

  const q = query.toString().toLowerCase().trim();
  let resultados = [];

  for (let i = 1; i < dataIndice.length; i++) {
    const row = dataIndice[i];
    const codigo = row[2].toString().toLowerCase();
    const texto = row[6].toString().toLowerCase();

    if (codigo.includes(q) || texto.includes(q)) {
      const versionId = row[1];
      let archivoUrl = "";
      
      for (let j = 1; j < dataVersiones.length; j++) {
        if (dataVersiones[j][0] == versionId) {
          archivoUrl = dataVersiones[j][3];
          break;
        }
      }

      resultados.push({
        id: row[0],
        codigo: row[2],
        descripcion: row[3],
        pagina: row[4],
        url_pdf: archivoUrl
      });
    }
  }

  if (resultados.length === 0) return { partes: [], notas: [], precios: [] };

  const codigoPrincipal = resultados[0].codigo;
  let notasEncontradas = [];
  let preciosEncontrados = [];

  for (let i = 1; i < dataNotas.length; i++) {
    const row = dataNotas[i];
    if (row[1].toString().toLowerCase() === codigoPrincipal.toLowerCase() || 
        (row[2] && row[2].toString().toLowerCase() === codigoPrincipal.toLowerCase())) {
      notasEncontradas.push({
        autor: row[4], fecha: row[5], confianza: row[6], nota: row[8]
      });
    }
  }

  for (let i = 1; i < dataPrecios.length; i++) {
    const row = dataPrecios[i];
    if (row[1].toString().toLowerCase() === codigoPrincipal.toLowerCase() && row[6] === true) {
      preciosEncontrados.push({
        precio: row[2], moneda: row[3], autor: row[4], fecha: row[5]
      });
    }
  }

  return { partes: resultados, notas: notasEncontradas, precios: preciosEncontrados };
}

function guardarNota(codigoA, codigoB, tipo, autor, confianza, nota) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("NotaReferencia");
  const id = Utilities.getUuid();
  const fecha = new Date().toISOString();
  sheet.appendRow([id, codigoA, codigoB, tipo, autor, fecha, confianza, "ACTIVA", nota]);
  return { success: true, message: "Nota guardada correctamente" };
}

function guardarPrecio(codigo, precio, moneda, autor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("PrecioReferencia");
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1].toString().toLowerCase() === codigo.toLowerCase() && data[i][6] === true) {
      sheet.getRange(i + 1, 7).setValue(false);
    }
  }

  const id = Utilities.getUuid();
  const fecha = new Date().toISOString();
  sheet.appendRow([id, codigo, precio, moneda, autor, fecha, true]);
  return { success: true, message: "Precio actualizado" };
}

// ==========================================
// 2. DOGET (Para probar en el navegador)
// ==========================================
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    message: "API del Catálogo Dinámico funcionando correctamente.",
    nota: "Usa POST desde la interfaz web para buscar partes."
  })).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 3. DOPOST (Para recibir datos de VS Code)
// ==========================================
function doPost(e) {
  try {
    let params;
    // Si viene como FormData (e.parameter)
    if (e.parameter && e.parameter.action) {
      params = e.parameter;
    } 
    // Si viene como JSON (e.postData.contents)
    else if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else {
      throw new Error("No se recibieron datos válidos.");
    }
    
    let resultado = {};

    if (params.action === "buscar") {
      resultado = buscarParte(params.query);
    } else if (params.action === "guardarNota") {
      resultado = guardarNota(params.codigoA, params.codigoB, params.tipo, params.autor, params.confianza, params.nota);
    } else if (params.action === "guardarPrecio") {
      resultado = guardarPrecio(params.codigo, params.precio, params.moneda, params.autor);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, data: resultado }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}