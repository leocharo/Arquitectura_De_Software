// --- 1. CAPA DE DOMINIO (CLASES POO) ---
// Define la lógica matemática y la gestión del Canvas.

/**
 * Clase para representar un Punto en coordenadas polares (r, theta).
 */
export class Punto {
    constructor(r, thetaDegrees) {
        if (r < 0) {
            console.error("La magnitud (r) no puede ser negativa.");
            this.r = 0;
        } else {
            this.r = r;
        }
        this.theta = this.degreesToRadians(thetaDegrees);
        this.thetaDegrees = thetaDegrees;
    }
    degreesToRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    getCartesian() {
        const x = this.r * Math.cos(this.theta);
        const y = this.r * Math.sin(this.theta);
        return { x, y };
    }
}

/**
 * Clase para representar el Vector que va del origen al Punto, y su dibujo.
 */
export class Vector {
    constructor(punto) {
        this.punto = punto;
    }

    /**
     * Dibuja el vector en el canvas.
     * @param {CanvasRenderingContext2D} ctx - Contexto del canvas.
     * @param {PlanoCartesiano} plano - Instancia del plano.
     * @param {boolean} isScatter - Si es true, dibuja un punto de dispersión simple (sin ángulo, línea delgada).
     */
    dibujar(ctx, plano, isScatter = false) {
        const cartesian = this.punto.getCartesian();
        const { x, y } = plano.convertCartesianToCanvas(cartesian.x, cartesian.y);
        const r = this.punto.r;
        const theta = this.punto.theta;
        const thetaDegrees = this.punto.thetaDegrees;
        const canvasCenter = plano.getCanvasCenter();

        // Colores y estilos ajustados para dispersión (scatter) o vector único
        const vectorColor = isScatter ? '#20c997' : '#dc3545'; // Verde o Rojo
        const pointColor = '#0d6efd'; // Azul fijo
        const angleColor = '#198754'; // Verde para el ángulo

        // 1. Dibujar el Vector (Línea)
        ctx.beginPath();
        ctx.moveTo(canvasCenter.x, canvasCenter.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = vectorColor;
        ctx.lineWidth = isScatter ? 1 : 3; // Vector más delgado si es dispersión
        ctx.stroke();

        // 2. Dibujar el Punto (Círculo)
        ctx.beginPath();
        ctx.arc(x, y, isScatter ? 4 : 6, 0, 2 * Math.PI); // Punto más pequeño si es dispersión
        ctx.fillStyle = pointColor;
        ctx.fill();
        ctx.strokeStyle = pointColor;
        ctx.lineWidth = isScatter ? 1 : 1.5;
        ctx.stroke();

        // 3. Dibujar el Arco del Ángulo y Texto (SOLO para el modo de vector único)
        if (!isScatter) {
            const arcRadius = Math.min(r * plano.escala * 0.3, plano.canvas.width / 4);

            ctx.beginPath();
            ctx.arc(canvasCenter.x, canvasCenter.y, arcRadius, 0, theta);
            ctx.strokeStyle = angleColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Texto del ángulo
            if (arcRadius > 50) {
                const textAngle = theta / 2;
                const textX = canvasCenter.x + (arcRadius + 15) * Math.cos(textAngle);
                const textY = canvasCenter.y - (arcRadius + 15) * Math.sin(textAngle);

                ctx.fillStyle = angleColor;
                ctx.font = '14px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`θ = ${thetaDegrees}°`, textX, textY);
            }
        }
    }
}

/**
 * Clase que gestiona el Canvas y el sistema de coordenadas.
 */
export class PlanoCartesiano {
    constructor(canvasId, maxR) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.maxR = maxR;
        this.resizeCanvas();
        const halfSize = Math.min(this.canvas.width, this.canvas.height) / 2;
        this.escala = halfSize / maxR;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const size = Math.min(container.clientWidth, 500);
        this.canvas.width = size;
        this.canvas.height = size;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        const halfSize = Math.min(this.canvas.width, this.canvas.height) / 2;
        this.escala = halfSize / this.maxR;
    }
    getCanvasCenter() {
        return { x: this.centerX, y: this.centerY };
    }
    convertCartesianToCanvas(xMath, yMath) {
        const xCanvas = this.centerX + (xMath * this.escala);
        const yCanvas = this.centerY - (yMath * this.escala);
        return { x: xCanvas, y: yCanvas };
    }

    isDarkMode() {
        return document.body.classList.contains('theme-dark');
    }

    dibujarEjes() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Colores basados en el tema
        const isDark = this.isDarkMode();
        const gridColor = isDark ? 'var(--canvas-grid)' : '#f8f9fa';
        const axisColor = isDark ? '#adb5bd' : '#adb5bd';
        const labelColor = isDark ? '#adb5bd' : '#4b5563';
        this.canvas.style.backgroundColor = isDark ? 'var(--canvas-bg)' : '#ffffff';

        // 1. Dibujar Grilla
        const gridStep = 50;
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 1;

        for (let y = this.centerY % gridStep; y < this.canvas.height; y += gridStep) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        for (let x = this.centerX % gridStep; x < this.canvas.width; x += gridStep) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // 2. Dibujar Ejes principales
        this.ctx.strokeStyle = axisColor;
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(0, this.centerY);
        this.ctx.lineTo(this.canvas.width, this.centerY);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX, 0);
        this.ctx.lineTo(this.centerX, this.canvas.height);
        this.ctx.stroke();

        // Flechas y Etiquetas de Ejes
        this.ctx.fillStyle = labelColor;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width - 5, this.centerY - 5);
        this.ctx.lineTo(this.canvas.width, this.centerY);
        this.ctx.lineTo(this.canvas.width - 5, this.centerY + 5);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX - 5, 5);
        this.ctx.lineTo(this.centerX, 0);
        this.ctx.lineTo(this.centerX + 5, 5);
        this.ctx.stroke();

        this.ctx.fillText('X', this.canvas.width - 15, this.centerY + 20);
        this.ctx.fillText('Y', this.centerX + 15, 15);
    }

    // Método para un solo vector
    dibujarVector(vector) {
        vector.dibujar(this.ctx, this, false);
    }

    dibujarMultiplesVectores(vectores) {
        this.dibujarEjes(); // Limpiar y dibujar ejes
        vectores.forEach(vector => {
            vector.dibujar(this.ctx, this, true); // Pasar 'true' para dibujo de dispersión
        });
    }
}