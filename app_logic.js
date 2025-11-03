// --- 2. CAPA DE APLICACIÓN (LÓGICA DE ORQUESTACIÓN Y UI) ---
// Importa las clases del modelo de dominio.
import { Punto, Vector, PlanoCartesiano } from './domain_model.js';

// --- CONFIGURACIÓN DE LA API DE GEMINI ---
const API_KEY = "";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

// Configuración inicial y elementos del DOM
const MAX_RADIUS = 10;
const plano = new PlanoCartesiano('cartesianCanvas', MAX_RADIUS);

const outputElement = document.getElementById('resultOutput');
const plotButton = document.getElementById('plotButton');
const historyModalElement = document.getElementById('historyModal');
const historyList = document.getElementById('historyList');
const clearHistoryButton = document.getElementById('clearHistoryButton');
const askGeminiButton = document.getElementById('askGeminiButton');
const geminiQuery = document.getElementById('geminiQuery');
const geminiResponseDiv = document.getElementById('geminiResponse');
const geminiLoading = document.getElementById('geminiLoading');
const themeToggle = document.getElementById('themeToggle');

// ELEMENTOS DEL DOM ESPECÍFICOS
const plotMultipleButton = document.getElementById('plotMultipleButton');
const inputMultiplePoints = document.getElementById('inputMultiplePoints');
const cartesianCanvas = document.getElementById('cartesianCanvas'); // Para el clic de zoom
const zoomModal = document.getElementById('zoomModal'); // Modal de zoom
const zoomCanvasContainer = document.getElementById('zoomCanvasContainer'); // Contenedor del canvas clonado


let graphHistory = JSON.parse(localStorage.getItem('graphHistory')) || [];

// --- Lógica de Tema (Dark/Light Mode) ---

function applyTheme(theme) {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(theme);

    const isDark = theme === 'theme-dark';
    themeToggle.innerHTML = isDark ?
        '<i class="fas fa-sun"></i>' :
        '<i class="fas fa-moon"></i>';

    localStorage.setItem('theme', theme);

    // Forzar el redibujo del Canvas y sus elementos al cambiar el tema
    plano.dibujarEjes();
    plotPolarCoordinates();
}

function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'theme-light';
    const newTheme = currentTheme === 'theme-light' ? 'theme-dark' : 'theme-light';
    applyTheme(newTheme);
}

// --- Lógica del Historial ---
function saveToHistory(r, thetaDegrees, cartesianX, cartesianY) {
    const now = new Date();
    const timestamp = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    if (graphHistory.length >= 50) {
        graphHistory.shift();
    }
    graphHistory.push({ r, thetaDegrees, cartesianX, cartesianY, timestamp });
    localStorage.setItem('graphHistory', JSON.stringify(graphHistory));
}

function displayHistory() {
    historyList.innerHTML = '';
    if (graphHistory.length === 0) {
        historyList.innerHTML = '<p class="text-secondary">No hay gráficas en el historial aún.</p>';
        return;
    }

    [...graphHistory].reverse().forEach((item) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'p-3 mb-2 history-item rounded';
        historyItem.innerHTML = `
            <p class="mb-0 small" style="color: var(--text-color);">
                <span class="fw-bold text-accent">Polares:</span> (r=${item.r}, θ=${item.thetaDegrees}°)</p>
            <p class="mb-0 small" style="color: var(--text-color);">
                <span class="ms-3 fw-bold text-primary">Cartesianas:</span> (X=${item.cartesianX.toFixed(2)}, Y=${item.cartesianY.toFixed(2)})
            </p>
            <p class="mb-0 text-secondary small mt-1">Graficado el: ${item.timestamp}</p>
        `;
        historyList.appendChild(historyItem);
    });
}

function clearHistory() {
    graphHistory = [];
    localStorage.removeItem('graphHistory');
    displayHistory();
}

export function plotPolarCoordinates() {
    const rInput = document.getElementById('inputR').value;
    const thetaInput = document.getElementById('inputTheta').value;

    const r = parseFloat(rInput);
    const thetaDegrees = parseFloat(thetaInput);

    if (isNaN(r) || isNaN(thetaDegrees) || r < 0) {
        outputElement.innerHTML = `<span class="text-danger">Error: Por favor, ingrese valores numéricos válidos (r ≥ 0).</span>`;
        plano.dibujarEjes();
        return;
    }

    const punto = new Punto(r, thetaDegrees);
    const vector = new Vector(punto);

    const cartesian = punto.getCartesian();
    outputElement.innerHTML = `
        <span class="text-accent fw-bold">Cartesianas:</span>
        (X: ${cartesian.x.toFixed(2)}, Y: ${cartesian.y.toFixed(2)})
    `;

    saveToHistory(r, thetaDegrees, cartesian.x, cartesian.y);

    plano.dibujarEjes();
    plano.dibujarVector(vector);
}

// --- LÓGICA PARA DIBUJAR MÚLTIPLES PUNTOS (Opción A) ---
function parseAndPlotMultipleCoordinates() {
    const text = inputMultiplePoints.value.trim();
    if (!text) {
        outputElement.innerHTML = `<span class="text-danger">Error: Ingrese pares (r, θ) separados por punto y coma (ej: 5, 45; 8, 120).</span>`;
        plano.dibujarEjes();
        return;
    }

    const pointPairs = text.split(';');
    const vectorsToDraw = [];
    let hasError = false;

    pointPairs.forEach((pair) => {
        const parts = pair.trim().split(',').map(p => parseFloat(p.trim()));

        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] >= 0) {
            const r = parts[0];
            const thetaDegrees = parts[1];

            const punto = new Punto(r, thetaDegrees);
            vectorsToDraw.push(new Vector(punto));
        } else if (pair.trim() !== '') {
            console.warn(`Par inválido en la entrada: ${pair}`);
            hasError = true;
        }
    });

    if (vectorsToDraw.length === 0) {
        outputElement.innerHTML = `<span class="text-danger">Error: No se encontraron pares de coordenadas polares válidos (r ≥ 0).</span>`;
        plano.dibujarEjes();
        return;
    }

    // Actualizar el indicador de coordenadas
    outputElement.innerHTML = `<span class="text-accent fw-bold">Gráfico de Dispersión:</span> ${vectorsToDraw.length} puntos dibujados.`;

    // Dibujar todos los vectores
    plano.dibujarMultiplesVectores(vectorsToDraw);
}

// --- LÓGICA DEL ZOOM (NUEVA FUNCIÓN) ---
function handleCanvasClick() {
    // 1. Crear un canvas temporal para asegurar una copia limpia y correcta
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cartesianCanvas.width;
    tempCanvas.height = cartesianCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // 2. Copiar la imagen actual del canvas principal al temporal
    tempCtx.drawImage(cartesianCanvas, 0, 0);

    // 3. Limpiar el contenedor del modal de zoom y añadir el canvas temporal
    zoomCanvasContainer.innerHTML = '';
    zoomCanvasContainer.appendChild(tempCanvas);

    // 4. Asegurarse de que el canvas temporal se adapte al contenedor del modal
    tempCanvas.style.width = '100%';
    tempCanvas.style.height = '100%';
    tempCanvas.id = 'zoomedCanvas'; // Asignar un ID para styling o futuras interacciones

    // 5. Mostrar el modal
    const bsZoomModal = new bootstrap.Modal(zoomModal);
    bsZoomModal.show();
}


// --- Lógica de la Calculadora IA (Gemini API) ---

// Función de utilidad para reintentos (Exponential Backoff)
const exponentialBackoff = async(fn, maxRetries = 5, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
    }
};

async function fetchGeminiAnswer(userQuery) {

    const systemPrompt = `
        Actúa como un profesor universitario experto en matemáticas, geometría, física y cálculo. 
        Tu objetivo es proporcionar respuestas precisas, claras y bien estructuradas, centradas en el contexto de la pregunta del usuario. 
        Utiliza siempre la notación matemática LaTeX para todas las fórmulas, ecuaciones y expresiones, encerrándolas entre delimitadores doble dólar ($$ ... $$). 
        Mantén un tono profesional y didáctico. Responde en español.
    `;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        tools: [{ "google_search": {} }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    const text = result.candidates && result.candidates[0] &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts[0].text ||
        "Error: No se pudo generar una respuesta.";

    return text;
}

async function handleAskGemini() {
    const query = geminiQuery.value.trim();
    if (!query) {
        geminiResponseDiv.innerHTML = `<p class="text-danger small mb-0">Por favor, escribe una pregunta válida.</p>`;
        return;
    }

    geminiLoading.classList.remove('d-none');
    geminiResponseDiv.innerHTML = ''; // Limpiar respuesta anterior
    askGeminiButton.disabled = true;

    try {
        const answer = await exponentialBackoff(() => fetchGeminiAnswer(query));

        // Usar marked para convertir el Markdown a HTML
        const htmlAnswer = marked.parse(answer);
        geminiResponseDiv.innerHTML = htmlAnswer;

    } catch (error) {
        console.error("Error al consultar Gemini:", error);
        geminiResponseDiv.innerHTML = `<p class="text-danger small mb-0">Error de conexión o API. Intente nuevamente.</p>`;
    } finally {
        geminiLoading.classList.add('d-none');
        askGeminiButton.disabled = false;
    }
}


// --- 3. GESTIÓN DE EVENTOS (Capa de Aplicación) ---

plotButton.addEventListener('click', plotPolarCoordinates);
themeToggle.addEventListener('click', toggleTheme);
plotMultipleButton.addEventListener('click', parseAndPlotMultipleCoordinates);

// EVENTO DE ZOOM: Al hacer clic en el canvas
cartesianCanvas.addEventListener('click', handleCanvasClick);

// Eventos de los modales
historyModalElement.addEventListener('show.bs.modal', displayHistory);
clearHistoryButton.addEventListener('click', clearHistory);

// Evento de la nueva Calculadora IA
askGeminiButton.addEventListener('click', handleAskGemini);

// Inicializar la aplicación
window.onload = function() {
    // Aplicar el tema guardado o el tema por defecto al cargar
    const savedTheme = localStorage.getItem('theme') || 'theme-light';
    applyTheme(savedTheme);

    const welcomeModal = new bootstrap.Modal(document.getElementById('welcomeModal'));
    welcomeModal.show();

    window.addEventListener('resize', () => {
        plano.resizeCanvas();
        // Al redimensionar, redibujamos el último vector simple.
        plotPolarCoordinates();
    });

    plano.resizeCanvas();
    plotPolarCoordinates();
};