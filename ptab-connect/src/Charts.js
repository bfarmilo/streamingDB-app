import React from 'react'
import { VictoryPie, VictoryTheme, VictoryContainer, VictoryLabel } from 'victory';
import type survivalStats from './typedefs';

const Charts = (props: {
  totalClaims: number,
  uniqueClaims: number,
  survival: Array<survivalStats>,
  survivalDup: Array<survivalStats>,
  details: Array<resultSet>,
  handleChartClick:(() => Event)
}) => {
  const totalSum = props.survival.reduce((sum, item) => sum + item.count, 0);
  const dupSum = props.survivalDup.reduce((sum, item) => sum + item.count, 0);
  const viewSize = 300
  return (
    <div className="ChartArea">
      <div className="SurvivalCharts">
        <div className="Chart">
          <svg viewBox={`0 0 ${viewSize} ${viewSize}`}>
            <VictoryPie
              containerComponent={<VictoryContainer responsive={false} />}
              height={viewSize}
              width={viewSize}
              innerRadius={35}
              labelRadius={66}
              theme={VictoryTheme.material}
              data={
                props.survivalDup.map(bin => {
                  return { x: bin.type.match(/_(.*)/)[1], y: bin.count, label: `${bin.type.match(/_(.*)/)[1]}\n${Math.round(bin.count / dupSum * 1000) / 10}%` }
                })
              }
              style={{
                labels: { fontSize: 10, fill: "black"}
              }}
            />
            <VictoryLabel
              textAnchor="middle"
              x={viewSize / 2} y={viewSize / 2}
              text={props.totalClaims}
            />
          </svg>
          <table className="rwd-table">
            <tbody>
              <tr>
                {props.survivalDup.map(item => (
                  <th key={item.type}>{item.type.match(/_(.*)/)[1]}</th>
                ))}
              </tr>
              <tr>
                {props.survivalDup.map(item => (
                  <td key={item.type}>{item.count}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="Spacer">
          <p> </p>
          </div>
        <div className="Chart">
          <svg viewBox={`0 0 ${viewSize} ${viewSize}`}>
            <VictoryPie
              containerComponent={<VictoryContainer responsive={false} />}
              height={viewSize}
              width={viewSize}
              innerRadius={35}
              labelRadius={60}
              theme={VictoryTheme.material}
              data={
                props.survival.map(bin => {
                  return { x: bin.type.match(/_(.*)/)[1], y: bin.count, label: `${bin.type.match(/_(.*)/)[1]}\n${Math.round(bin.count / totalSum * 1000) / 10}%` }
                })
              }
              style={{
                labels: { fontSize: 10, fill: "black"}
              }}
            />
            <VictoryLabel
              textAnchor="middle"
              x={viewSize/2} y={viewSize/2}
              text={props.uniqueClaims}
            />
          </svg>
          <table className="rwd-table">
            <tbody>
              <tr>
                {props.survival.map(item => (
                  <th key={item.type}>{item.type.match(/_(.*)/)[1]}</th>
                ))}
              </tr>
              <tr>
                {props.survival.map(item => (
                  <td key={item.type}>{item.count}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
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