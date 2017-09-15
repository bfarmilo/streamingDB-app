//@flow

import React from 'react';

const ControlArea = (props: {
  value: string,
  table: string,
  field: string,
  tables: Array<string>,
  fields: Array<string>,
  count: number,
  totalCount: number,
  mode: string,
  goButton: boolean,
  detailTable: string,
  selectTable: (() => Event),
  selectField: (() => Event),
  newQuery: (() => Event),
  setValue: (() => Event),
  switchMode: (() => Event),
  tableDetail: (() => Event),
  detailGoButton: boolean,
  detailCount: number,
  detailTotalCount: number,
  disableDetails: boolean
}) => {
  const tableMode = props.mode === 'table';
  const details = !props.disableDetails ? (
    <div>
      <div>
        <input className="custominput" name="TableDetail" id="tabledetail" onChange={props.setDetailTable} value={props.detailTable} />
        <button name="GetDetails" onClick={props.getDetailTable}>{props.detailGoButton ? 'Go' : 'More'}</button>
      </div>
      <div>
      </div>
      <p>showing {props.detailCount}/{props.detailTotalCount} records</p>
    </div>
  ) : <div />
  return (
    <div className="ControlArea">
      <h3>PTAB Data Extraction</h3>
      {tableMode ? (
        <div className="TableControls">
          <div>
            <span className="customdropdown">
              <select name="ChooseField" id="fieldselect" onChange={props.selectField} value={props.field}>
                {props.fields.map(val => (
                  <option key={`ID_${val}`} value={val}>
                    {val}
                  </option>
                ))
                }
              </select>
            </span> =
            <input className="custominput" name="ChooseValue" id="valueselect" onChange={props.setValue} value={props.value} />
            in
            <span className="customdropdown">
              <select name="ChooseTable" id="tableselect" onChange={props.selectTable} value={props.table}>
                {props.tables.map(val => (
                  <option key={`ID_${val}`} value={val}>
                    {val}
                  </option>
                ))
                }
              </select>
            </span>
            <button onClick={props.newQuery}>{props.goButton ? 'Go' : 'More'}</button>
            <div>
            </div>
            <p>showing {props.count}/{props.totalCount} records</p>
          </div>
        </div>) : {details}
        }
      <div className="SwitchView">
        <button onClick={props.switchMode}>Switch to {tableMode ? 'Chart' : 'Table'} View</button>
      </div>
    </div>
  );
};

export default ControlArea;