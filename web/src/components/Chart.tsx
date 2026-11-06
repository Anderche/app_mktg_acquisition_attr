import { BarChart, LineChart, SankeyChart } from "echarts/charts";
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import ReactEChartsCore from "echarts-for-react/lib/core";

echarts.use([BarChart, LineChart, SankeyChart, GridComponent, TooltipComponent, LegendComponent, AriaComponent, SVGRenderer]);

interface ChartProps {
  option: EChartsOption;
  height: number;
  label: string;
  className?: string;
}

export function Chart({ option, height, label, className }: ChartProps) {
  return (
    <div role="img" aria-label={label} className={className}>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        notMerge
        lazyUpdate
        opts={{ renderer: "svg" }}
        style={{ height, width: "100%" }}
      />
    </div>
  );
}
