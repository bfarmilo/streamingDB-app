import React from 'react'
import { VictoryPie, VictoryTheme, VictoryContainer } from 'victory';
import type survivalStats from './typedefs';

const Charts = (props: {
  totalClaims: number,
  uniqueClaims: number,
  survival: Array<survivalStats>,
  survivalDup: Array<survivalStats>
}) => {
  return (
    <div className="SurvivalCharts">
      <div className="Chart">
        <p> total Claims: {props.totalClaims} </p>
        <VictoryPie
          containerComponent={<VictoryContainer responsive={false} />}
          height={400}
          width={600}
          theme={VictoryTheme.material}
          data={
            props.survivalDup.map(bin => {
              return { x: bin.type.match(/_(.*)/)[1], y: bin.count }
            })
          }
          style={
            {
              labels: {
                fontSize: 12
              }
            }
          }
        />
        <table>
          <tbody>
            <tr>
              {props.survivalDup.map(item => (
                <td key={item.type}>{item.type}</td>
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
      <div className="Chart">
        <p> unique Claims: {props.uniqueClaims} </p>
        <VictoryPie
          containerComponent={<VictoryContainer responsive={false} />}
          height={400}
          width={600}
          theme={VictoryTheme.material}
          data={
            props.survival.map(bin => {
              return { x: bin.type.match(/_(.*)/)[1], y: bin.count }
            })
          }
          style={
            {
              labels: {
                fontSize: 12
              }
            }
          }
        />
        <table>
          <tbody>
            <tr>
              {props.survival.map(item => (
                <td key={item.type}>{item.type}</td>
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
  )
}

export default Charts;