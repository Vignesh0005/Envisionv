import React, { useRef, useEffect, useState, useCallback } from 'react';

const HistogramChart = ({ counts, bins, minThreshold, maxThreshold, onThresholdChange }) => {
    const canvasRef = useRef(null);
    const [isDraggingMin, setIsDraggingMin] = useState(false);
    const [isDraggingMax, setIsDraggingMax] = useState(false);
    const [tooltipContent, setTooltipContent] = useState('');
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [showTooltip, setShowTooltip] = useState(false);

    const chartWidth = 400; // Adjust as needed to fit UI
    const chartHeight = 150; // Adjust as needed to fit UI
    const padding = 20;

    // Convert intensity value to X-coordinate on canvas
    const intensityToX = useCallback((intensity) => {
        return padding + (intensity / 255) * (chartWidth - 2 * padding);
    }, [chartWidth, padding]);

    // Convert X-coordinate on canvas to intensity value
    const xToIntensity = useCallback((x) => {
        const value = Math.round(((x - padding) / (chartWidth - 2 * padding)) * 255);
        return Math.max(0, Math.min(255, value)); // Snap within bounds
    }, [chartWidth, padding]);

    // Function to draw the histogram
    const drawHistogram = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Set canvas size for crisp rendering
        canvas.width = chartWidth;
        canvas.height = chartHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const maxCount = Math.max(...counts);

        // Draw histogram bars/lines
        ctx.beginPath();
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 1;

        counts.forEach((count, index) => {
            const x = intensityToX(bins[index]);
            const y = chartHeight - padding - (count / maxCount) * (chartHeight - 2 * padding);
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Draw min threshold line
        ctx.beginPath();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        const minX = intensityToX(minThreshold);
        ctx.moveTo(minX, padding);
        ctx.lineTo(minX, chartHeight - padding);
        ctx.stroke();

        // Draw max threshold line
        ctx.beginPath();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        const maxX = intensityToX(maxThreshold);
        ctx.moveTo(maxX, padding);
        ctx.lineTo(maxX, chartHeight - padding);
        ctx.stroke();

        // Draw border
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.strokeRect(padding, padding, chartWidth - 2 * padding, chartHeight - 2 * padding);

    }, [counts, bins, minThreshold, maxThreshold, chartWidth, chartHeight, padding, intensityToX]);

    useEffect(() => {
        if (counts && counts.length > 0) {
            drawHistogram();
        }
    }, [drawHistogram, counts]);

    // --- Dragging Logic ---
    const handleMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;

        const minX = intensityToX(minThreshold);
        const maxX = intensityToX(maxThreshold);

        // Check if user clicked near min line
        if (Math.abs(mouseX - minX) < 8) { // Increased tolerance for easier grabbing
            setIsDraggingMin(true);
            setShowTooltip(true);
        }
        // Check if user clicked near max line
        else if (Math.abs(mouseX - maxX) < 8) { // Increased tolerance
            setIsDraggingMax(true);
            setShowTooltip(true);
        }
    };

    const handleMouseMove = (e) => {
        if (!isDraggingMin && !isDraggingMax) {
            setShowTooltip(false); // Hide tooltip if not dragging
            return;
        }

        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let newIntensity = xToIntensity(mouseX);
        let newMin = minThreshold;
        let newMax = maxThreshold;

        if (isDraggingMin) {
            newMin = Math.min(newIntensity, maxThreshold); // Ensure minThreshold doesn't exceed maxThreshold
            onThresholdChange(newMin, newMax);
            setTooltipContent(`Min: ${newMin}`);
            setTooltipPosition({ x: mouseX, y: mouseY - 20 }); // Position above cursor
        } else if (isDraggingMax) {
            newMax = Math.max(newIntensity, minThreshold); // Ensure maxThreshold doesn't go below minThreshold
            onThresholdChange(newMin, newMax);
            setTooltipContent(`Max: ${newMax}`);
            setTooltipPosition({ x: mouseX, y: mouseY - 20 });
        }
    };

    const handleMouseUp = () => {
        setIsDraggingMin(false);
        setIsDraggingMax(false);
        setShowTooltip(false);
    };

    return (
        <div style={{ position: 'relative', width: chartWidth, height: chartHeight }}>
            <canvas
                ref={canvasRef}
                width={chartWidth}
                height={chartHeight}
                style={{
                    border: '1px solid #ccc',
                    cursor: (isDraggingMin || isDraggingMax) ? 'grabbing' : 'grab',
                    touchAction: 'none' // Prevent scrolling on touch devices during drag
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp} // Stop dragging if mouse leaves canvas
            />
            {showTooltip && (isDraggingMin || isDraggingMax) && (
                <div
                    style={{
                        position: 'absolute',
                        left: tooltipPosition.x,
                        top: tooltipPosition.y,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '5px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        pointerEvents: 'none', // Allow mouse events to pass through
                        transform: 'translateX(-50%)', // Center tooltip above cursor
                        zIndex: 100
                    }}
                >
                    {tooltipContent}
                </div>
            )}
        </div>
    );
};

export default HistogramChart; 