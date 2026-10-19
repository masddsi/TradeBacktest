import { useEffect, useRef } from 'react';
import {
  AreaSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';
import type { EquityPoint } from '../lib/types';

const GAIN = '#16c784';
const LOSS = '#ef5350';
const ACCENT = '#22d3ee';

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function EquityChart({ data }: { data: EquityPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8b97a8',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(35, 43, 58, 0.35)' },
        horzLines: { color: 'rgba(35, 43, 58, 0.35)' },
      },
      rightPriceScale: { borderColor: '#232b3a' },
      timeScale: { borderColor: '#232b3a', fixLeftEdge: true, fixRightEdge: true },
      crosshair: {
        vertLine: { color: '#2f3a4d', labelBackgroundColor: '#1a2130' },
        horzLine: { color: '#2f3a4d', labelBackgroundColor: '#1a2130' },
      },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: ACCENT,
      topColor: hexToRgba(ACCENT, 0.28),
      bottomColor: hexToRgba(ACCENT, 0.02),
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    const seen = new Set<string>();
    const points = data
      .filter((p) => {
        if (seen.has(p.date)) return false;
        seen.add(p.date);
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => ({ time: p.date, value: p.equity }));

    series.setData(points);

    const last = points.at(-1)?.value ?? 0;
    const color = last >= 0 ? GAIN : LOSS;
    series.applyOptions({
      lineColor: color,
      topColor: hexToRgba(color, 0.28),
      bottomColor: hexToRgba(color, 0.02),
    });

    if (points.length) chart.timeScale().fitContent();
  }, [data]);

  return <div ref={containerRef} className="h-full w-full" />;
}
