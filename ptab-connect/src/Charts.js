import React from 'react'
import { VictoryPie, VictoryTheme, VictoryContainer } from 'victory';
import type survivalStats from './typedefs';

const Charts = (props: {
  totalClaims: number,
  uniqueClaims: number,
  survival: Array<survivalStats>
}) => {
  return (
    <div className="SurvivalChart">
      <p> total Claims: {props.totalClaims} </p>
      <p> unique Claims: {props.uniqueClaims} </p>
      <p> Distribution: </p>
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
  )
}

export default Charts;