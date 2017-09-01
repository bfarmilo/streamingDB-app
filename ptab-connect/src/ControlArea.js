//@flow

import React from 'react';

const ControlArea = (props: {
  value: string,
  table: string,
  field: string,
  tables: Array<string>,
  fields: Array<string>,
  count: number,
  mode: string,
  selectTable: (() => Event),
  selectField: (() => Event),
  newQuery: (() => Event),
  setValue: (() => Event),
  switchMode: (() => Event)
}) => {
  const tableMode = props.mode === 'table';
  return (
    <div className="ControlArea">
      <h3>PTAB Data Extraction</h3>
      {tableMode ? (
        <div className="TableControls">
          <h4>Current Search Set:
          <select name="ChooseField" id="fieldselect" onChange={props.selectField} value={props.field}>
              {props.fields.map(val => (
                <option key={`ID_${val}`} value={val}>
                  {val}
                </option>
              ))
              }
            </select> =
            <input name="ChooseValue" id="valueselect" onChange={props.setValue} value={props.value} />
            in
          <select name="ChooseTable" id="tableselect" onChange={props.selectTable} value={props.table}>
              {props.tables.map(val => (
                <option key={`ID_${val}`} value={val}>
                  {val}
                </option>
              ))
              }
            </select>
            <button onClick={props.newQuery}>Go</button>
          </h4>
          <div>
            {props.count} rows returned
        </div>
        </div>) : ''}
      <div>
        <button onClick={props.switchMode}>View {tableMode ? 'Chart' : 'Table'}</button>
      </div>
    </div>
  );
};

export default ControlArea;