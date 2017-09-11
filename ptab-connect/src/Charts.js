import React from 'react'
import PieChart from './PieChart';
import type survivalStats from './typedefs';

const Charts = (props: {
  chartData: Array<{ index: number, count: number, data: Array<survivalStats> }>,
  details: Array<resultSet>,
  handleChartClick: (() => Event)
}) => {
  const viewSize = 300;
  // TODO: convert PieCharts to an array.map. This means survival, count are elements of the array
  return (
    <div className="ChartArea">
      <div className="SurvivalCharts">
        {props.chartData.map(item => (
          <div>
            <h3>{item.title}</h3>
          <PieChart key={item.index}
            data={item.data}
            total={item.count}
            viewSize={viewSize}
          />
          </div>))}
      </div>
      <div className="DetailTable">
        <table>
          <tbody>
            <tr>
              <th>Patent: Claim</th>
              <th>unaffected</th>
              <th>weakened</th>
              <th>impaired</th>
              <th>killed</th>
              <th>unbinned</th>
            </tr>
            {props.details.map(item => (
              <tr key={`${item.ID}`}>
                <td>{item.Patent}:{item.Claim}</td>
                <td>{item.survivalStatus === '2_unaffected' ? `${item.IPR}` : ''}</td>
                <td>{item.survivalStatus === '3_weakened' ? `${item.IPR}` : ''}</td>
                <td>{item.survivalStatus === '4_impaired' ? `${item.IPR}` : ''}</td>
                <td>{item.survivalStatus === '5_killed' ? `${item.IPR}` : ''}</td>
                <td>{item.survivalStatus === '6_unbinned' ? `${item.IPR}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Charts;