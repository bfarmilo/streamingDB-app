import React from 'react';
import { VictoryPie, VictoryTheme, VictoryContainer, VictoryLabel } from 'victory';

const PieChart = (props:{
  total:number,
  data:Array<{type: string, count:number}>,
  viewSize: number,
  availableTables:Array<string>,
  handleNewSelection: (() => Event),
  currentSelection: (() => Event)
}) => {
  return (
      <div className="Chart">
          <svg viewBox={`0 0 ${props.viewSize} ${props.viewSize}`}>
            <VictoryPie
              containerComponent={<VictoryContainer responsive={false} />}
              height={props.viewSize}
              width={props.viewSize}
              innerRadius={35}
              labelRadius={66}
              theme={VictoryTheme.material}
              data={
                props.data.map(bin => {
                  return { x: bin.type.match(/_(.*)/)[1], y: bin.count, label: `${bin.type.match(/_(.*)/)[1]}\n${Math.round(bin.count / props.total * 1000) / 10}%` }
                })
              }
              style={{
                labels: { fontSize: 10, fill: "black"}
              }}
            />
            <VictoryLabel
              textAnchor="middle"
              x={props.viewSize / 2} y={props.viewSize / 2}
              text={props.total}
            />
          </svg>
          <table className="rwd-table">
            <tbody>
              <tr>
                {props.data.map(item => (
                  <th key={item.type}>{item.type.match(/_(.*)/)[1]}</th>
                ))}
              </tr>
              <tr>
                {props.data.map(item => (
                  <td key={item.type}>{item.count}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
  )
}

export default PieChart;