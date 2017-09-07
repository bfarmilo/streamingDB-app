//@flow

import React, { Component } from 'react';
import ControlArea from './ControlArea';
import ResultTable from './ResultTable';
import Charts from './Charts';
import MultiEdit from './MultiEdit';
import './App.css';

class App extends Component {
  state = {
    records: [],
    field: "PatentOwner",
    value: "Personalized",
    table: "FWDStatus:unpatentable",
    fields: [],
    tables: [],
    count: 0,
    totalCount: 0,
    totalClaims: 0,
    uniqueClaims: 0,
    survival: [],
    survivalDup: [],
    mode: 'chart',
    goButton: true,
    cursor: 0,
    detailTable: 'out:i_w',
    details: [],
    detailCursor: 0,
    detailCount: 0,
    detailTotalCount: 0,
    detailGoButton: true
  }

  componentDidMount() {
    fetch('/users/fields')
      .then(res => res.json())
      .then(fields => this.setState({ fields }))
    fetch('/users/tables')
      .then(res => res.json())
      .then(tables => this.setState({ tables }))
    fetch(`/users/run?field=${this.state.field}&value=${this.state.value}&cursor=${this.state.cursor}&table=${encodeURIComponent(this.state.table)}`)
      .then(res => res.json())
      .then(records => {
        this.setState({ cursor: records.cursor, count: records.count, records: records.data, totalCount: records.totalCount })
      })
    fetch('/users/survival')
      .then(res => res.json())
      .then(results => {
        this.setState({
          totalClaims: results.totalClaims,
          uniqueClaims: results.uniqueClaims,
          survival: results.survival,
          survivalDup: results.survivalDup
        })
      })
  }

  setDetailTable = (event) => {
    console.log('new detail table selected %s', event.target.value);
    this.setState({ detailTable: event.target.value, detailGoButton: true });
  }

  selectTable = (event) => {
    console.log('new table selected %s', event.target.value);
    this.setState({ table: event.target.value, goButton: true });
  }

  selectField = (event) => {
    console.log('new field selected %s', event.target.value);
    this.setState({ field: event.target.value, goButton: true });
  }

  setValue = (event) => {
    console.log('new value %s', event.target.value);
    this.setState({ value: event.target.value, goButton: true });
  }

  getDetailTable = () => {
    const cursor = this.state.detailGoButton ? 0 : this.state.detailCursor;
    fetch(`/users/survivaldetail2?table=${encodeURIComponent(this.state.detailTable)}&cursor=${cursor}`)
      .then(res => res.json())
      .then(result => {
        console.log(result);
        this.setState(oldState => {
          return {
            detailCount: oldState.detailGoButton ? result.count : oldState.detailCount + result.count,
            details: oldState.detailGoButton ? result.data : oldState.details.concat(result.data),
            detailTotalCount: result.totalCount,
            cursor: result.cursor,
            detailGoButton: result.cursor === 0
          }
        });
      })
  }

  multiEdit = () => {
    fetch('/users/multiedit', {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ rows: ['66804'], field: 'PatentOwner', newValue: 'Personalized Media Communications (npe)' })
    })
      .then(res => res.json())
      .then(result => console.log(result));
  }

  newQuery = () => {
    const cursor = this.state.goButton ? 0 : this.state.cursor;
    console.log('request for new query of %s where %s=%s', this.state.table, this.state.field, this.state.value)
    fetch(`/users/run?field=${this.state.field}&value=${this.state.value}&cursor=${cursor}&table=${encodeURIComponent(this.state.table)}`)
      .then(res => res.json())
      .then(records => {
        this.setState(oldState => {
          return {
            count: oldState.goButton ? records.count : oldState.count + records.count,
            totalCount: records.totalCount,
            records: oldState.goButton ? records.data : oldState.records.concat(records.data),
            cursor: records.cursor,
            goButton: records.cursor === 0
          }
        });
      });
  }

  switchMode = () => {
    console.log('request for mode switch');
    let mode = this.state.mode;
    mode === 'table' ? mode = 'chart' : mode = 'table';
    this.setState({ mode });
  }

  render() {
    const viewArea = this.state.mode === 'table'
      ? (<ResultTable records={this.state.records} />)
      : (<Charts
        totalClaims={this.state.totalClaims}
        uniqueClaims={this.state.uniqueClaims}
        survival={this.state.survival}
        survivalDup={this.state.survivalDup}
        details={this.state.details}
      />)
    return (
      <div className="App">
        <ControlArea
          value={this.state.value}
          tables={this.state.tables}
          fields={this.state.fields}
          table={this.state.table}
          field={this.state.field}
          count={this.state.count}
          totalCount={this.state.totalCount}
          mode={this.state.mode}
          selectTable={this.selectTable}
          selectField={this.selectField}
          newQuery={this.newQuery}
          setValue={this.setValue}
          switchMode={this.switchMode}
          goButton={this.state.goButton}
          detailGoButton={this.state.detailGoButton}
          detailTable={this.state.detailTable}
          setDetailTable={this.setDetailTable}
          getDetailTable={this.getDetailTable}
          detailCount={this.state.detailCount}
          detailTotalCount={this.state.detailTotalCount}
        />
        <MultiEdit
          testMultiEdit={this.multiEdit}
        />
        {viewArea}
      </div>
    );
  }
}

export default App;