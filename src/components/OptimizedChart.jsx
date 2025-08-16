import { lazy, Suspense } from 'react';
import PropTypes from 'prop-types';

const ReactECharts = lazy(() => import('echarts-for-react'));

export default function OptimizedChart({ option, style, ...props }) {
  return (
    <Suspense fallback={
      <div className="h-96 bg-gray-100 border rounded-md flex items-center justify-center" style={style}>
        <div className="text-gray-500">Loading chart...</div>
      </div>
    }>
      <ReactECharts
        option={option}
        style={style}
        lazyUpdate={true}
        notMerge={true}
        {...props}
      />
    </Suspense>
  );
}

OptimizedChart.propTypes = {
  option: PropTypes.object.isRequired,
  style: PropTypes.object,
};