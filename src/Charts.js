//@flow

import React from 'react'
import PieChart from './PieChart';
import type survivalStats from './typedefs';

const Charts = (props: {
  chartData: Array<{ index: number, count: number, data: Array<survivalStats> }>,
  details: Array<resultSet>,
  handleChartClick: (() => Event),
  availableTables: Array<string>,
  currentSelection: Array<string>,
  selectChart: (() => Event),
  disableDetails: boolean
}) => {
  const viewSize = 300;
  const details = !props.disableDetails ? (<div className="DetailTable">
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
</div>) : <div />;
  return (
    <div className="ChartArea">
      <div className="SurvivalCharts">
        {props.chartData.map((item, idx) => (
          <div className="SingleChart" key={`chart${item.index}`}>
            <h3>{item.title}</h3>
            <span className="customdropdown">
              <select name={`chart${item.index}`} id={item.index} onChange={props.selectChart} value={props.currentSelection[idx]}>
                {props.availableTables.map(val => (
                  <option key={`ID_${val}`} value={val}>
                    {val}
                  </option>
                ))
                }
              </select>
            </span>
            <PieChart
              data={item.data}
              total={item.count}
              viewSize={viewSize}
            />
          </div>))}
      </div>
      {details}
    </div>
  )
}

export default Charts;