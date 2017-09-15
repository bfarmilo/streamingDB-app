//@flow

import React, { Component } from 'react';
import ControlArea from './ControlArea';
import ResultTable from './ResultTable';
import Charts from './Charts';
import MultiEdit from './MultiEdit';
import './App.css';

const baseUrl = "https://ptab-server.azurewebsites.net";
const userID = Math.round(Math.random() * 1000);

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
    totalClaims: [],
    uniqueClaims: [],
    chartData: [],
    chartTitle: ['all', 'patentownertype:lawfirm'],
    mode: 'chart',
    goButton: true,
    cursor: 0,
    detailTable: 'out:i_w',
    details: [],
    detailCursor: 0,
    detailCount: 0,
    detailTotalCount: 0,
    detailGoButton: true,
    spinner: true
  }

  componentDidMount() {
    fetch(`${baseUrl}/fields?user=${userID}`)
      .then(res => res.json())
      .then(fields => this.setState({ fields }))
    fetch(`${baseUrl}/tables?user=${userID}`)
      .then(res => res.json())
      .then(tables => this.setState({ tables }))
    fetch(`${baseUrl}/run?user=${userID}&field=${this.state.field}&value=${this.state.value}&cursor=${this.state.cursor}&table=${encodeURIComponent(this.state.table)}`)
      .then(res => res.json())
      .then(records => {
        this.setState({ cursor: records.cursor, count: records.count, records: records.data, totalCount: records.totalCount })
      })
    return Promise.all(this.state.chartTitle.map((table, index) => {
      return fetch(`${baseUrl}/survival?user=${userID}&table=${encodeURIComponent(table)}&chart=${index}`)
        .then(res => res.json())
    }))
      .then(results => {
        const chartData = [].concat(...results.map((item, idx) => {
          return [{ title: `${item.title} - with Duplicates`, index: (idx + 1) * 2 - 1, count: item.countTotal, data: item.survivalTotal }]
            .concat([{ title: `${item.title} - unique only`, index: (idx + 1) * 2, count: item.countUnique, data: item.survivalUnique }])
        }))
        console.log('got initial chart Data\n%j', chartData);
        this.setState({ chartData, spinner: false })
      })
  }

  setDetailTable = (event) => {
    console.log('new detail table selected %s', event.target.value);
    this.setState({ detailTable: event.target.value, detailGoButton: true });
  }

  selectChart = (event) => {
    console.log('changing %s to %s, chart %d', event.target.name, event.target.value, parseInt(event.target.id, 10) - 1);
    // set chartTitle to update the screen and the spinner
    const newTitle = this.state.chartTitle.map((item, index) => {
      let changeIdx = parseInt(event.target.id, 10) <= 2 ? 0 : 1;
      if (changeIdx === index) return event.target.value;
      return item;
    });
    this.setState({ spinner: true, chartTitle: newTitle });
    // fetch the new chart data
    Promise.all(newTitle.map((table, index) => {
      return fetch(`${baseUrl}/survival?user=${userID}&table=${encodeURIComponent(table)}&chart=${index}`)
        .then(res => res.json())
    }))
      .then(results => {
        const chartData = [].concat(...results.map((item, idx) => {
          return [{ title: `${item.title} - with Duplicates`, index: (idx + 1) * 2 - 1, count: item.countTotal, data: item.survivalTotal }]
            .concat([{ title: `${item.title} - unique only`, index: (idx + 1) * 2, count: item.countUnique, data: item.survivalUnique }])
        }))
        console.log('got new chart Data\n%j', chartData);
        // set chartData and spinner:false
        this.setState({ chartData, spinner: false })
      })

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
    this.setState({ spinner: true })
    const cursor = this.state.detailGoButton ? 0 : this.state.detailCursor;
    fetch(`${baseUrl}/survivaldetail?user=${userID}&table=${encodeURIComponent(this.state.detailTable)}&cursor=${cursor}`)
      .then(res => res.json())
      .then(result => {
        console.log(result);
        this.setState(oldState => {
          return {
            detailCount: oldState.detailGoButton ? result.count : oldState.detailCount + result.count,
            details: oldState.detailGoButton ? result.data : oldState.details.concat(result.data),
            detailTotalCount: result.totalCount,
            cursor: result.cursor,
            detailGoButton: result.cursor === 0,
            spinner: false
          }
        });
      })
  }

  multiEdit = () => {
    fetch(`${baseUrl}/multiedit?user=${userID}`, {
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
    this.setState({ spinner: true });
    const cursor = this.state.goButton ? 0 : this.state.cursor;
    console.log('request for new query of %s where %s=%s', this.state.table, this.state.field, this.state.value)
    fetch(`${baseUrl}/run?user=${userID}&field=${this.state.field}&value=${this.state.value}&cursor=${cursor}&table=${encodeURIComponent(this.state.table)}`)
      .then(res => res.json())
      .then(records => {
        this.setState(oldState => {
          return {
            count: oldState.goButton ? records.count : oldState.count + records.count,
            totalCount: records.totalCount,
            records: oldState.goButton ? records.data : oldState.records.concat(records.data),
            cursor: records.cursor,
            goButton: records.cursor === 0,
            spinner: false
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
        disableDetails={true}
        totalClaims={this.state.totalClaims}
        uniqueClaims={this.state.uniqueClaims}
        chartData={this.state.chartData}
        details={this.state.details}
        availableTables={this.state.tables}
        selectChart={this.selectChart}
        currentSelection={[].concat(...this.state.chartTitle.map(item => [item, item]))}
      />)
    const logo = this.state.spinner ? (
      <modal className="logo-background">
        <div className="App-logo">
          <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 841.9 595.3">
            <g fill="#61DAFB">
              <path d="M666.3 296.5c0-32.5-40.7-63.3-103.1-82.4 14.4-63.6 8-114.2-20.2-130.4-6.5-3.8-14.1-5.6-22.4-5.6v22.3c4.6 0 8.3.9 11.4 2.6 13.6 7.8 19.5 37.5 14.9 75.7-1.1 9.4-2.9 19.3-5.1 29.4-19.6-4.8-41-8.5-63.5-10.9-13.5-18.5-27.5-35.3-41.6-50 32.6-30.3 63.2-46.9 84-46.9V78c-27.5 0-63.5 19.6-99.9 53.6-36.4-33.8-72.4-53.2-99.9-53.2v22.3c20.7 0 51.4 16.5 84 46.6-14 14.7-28 31.4-41.3 49.9-22.6 2.4-44 6.1-63.6 11-2.3-10-4-19.7-5.2-29-4.7-38.2 1.1-67.9 14.6-75.8 3-1.8 6.9-2.6 11.5-2.6V78.5c-8.4 0-16 1.8-22.6 5.6-28.1 16.2-34.4 66.7-19.9 130.1-62.2 19.2-102.7 49.9-102.7 82.3 0 32.5 40.7 63.3 103.1 82.4-14.4 63.6-8 114.2 20.2 130.4 6.5 3.8 14.1 5.6 22.5 5.6 27.5 0 63.5-19.6 99.9-53.6 36.4 33.8 72.4 53.2 99.9 53.2 8.4 0 16-1.8 22.6-5.6 28.1-16.2 34.4-66.7 19.9-130.1 62-19.1 102.5-49.9 102.5-82.3zm-130.2-66.7c-3.7 12.9-8.3 26.2-13.5 39.5-4.1-8-8.4-16-13.1-24-4.6-8-9.5-15.8-14.4-23.4 14.2 2.1 27.9 4.7 41 7.9zm-45.8 106.5c-7.8 13.5-15.8 26.3-24.1 38.2-14.9 1.3-30 2-45.2 2-15.1 0-30.2-.7-45-1.9-8.3-11.9-16.4-24.6-24.2-38-7.6-13.1-14.5-26.4-20.8-39.8 6.2-13.4 13.2-26.8 20.7-39.9 7.8-13.5 15.8-26.3 24.1-38.2 14.9-1.3 30-2 45.2-2 15.1 0 30.2.7 45 1.9 8.3 11.9 16.4 24.6 24.2 38 7.6 13.1 14.5 26.4 20.8 39.8-6.3 13.4-13.2 26.8-20.7 39.9zm32.3-13c5.4 13.4 10 26.8 13.8 39.8-13.1 3.2-26.9 5.9-41.2 8 4.9-7.7 9.8-15.6 14.4-23.7 4.6-8 8.9-16.1 13-24.1zM421.2 430c-9.3-9.6-18.6-20.3-27.8-32 9 .4 18.2.7 27.5.7 9.4 0 18.7-.2 27.8-.7-9 11.7-18.3 22.4-27.5 32zm-74.4-58.9c-14.2-2.1-27.9-4.7-41-7.9 3.7-12.9 8.3-26.2 13.5-39.5 4.1 8 8.4 16 13.1 24 4.7 8 9.5 15.8 14.4 23.4zM420.7 163c9.3 9.6 18.6 20.3 27.8 32-9-.4-18.2-.7-27.5-.7-9.4 0-18.7.2-27.8.7 9-11.7 18.3-22.4 27.5-32zm-74 58.9c-4.9 7.7-9.8 15.6-14.4 23.7-4.6 8-8.9 16-13 24-5.4-13.4-10-26.8-13.8-39.8 13.1-3.1 26.9-5.8 41.2-7.9zm-90.5 125.2c-35.4-15.1-58.3-34.9-58.3-50.6 0-15.7 22.9-35.6 58.3-50.6 8.6-3.7 18-7 27.7-10.1 5.7 19.6 13.2 40 22.5 60.9-9.2 20.8-16.6 41.1-22.2 60.6-9.9-3.1-19.3-6.5-28-10.2zM310 490c-13.6-7.8-19.5-37.5-14.9-75.7 1.1-9.4 2.9-19.3 5.1-29.4 19.6 4.8 41 8.5 63.5 10.9 13.5 18.5 27.5 35.3 41.6 50-32.6 30.3-63.2 46.9-84 46.9-4.5-.1-8.3-1-11.3-2.7zm237.2-76.2c4.7 38.2-1.1 67.9-14.6 75.8-3 1.8-6.9 2.6-11.5 2.6-20.7 0-51.4-16.5-84-46.6 14-14.7 28-31.4 41.3-49.9 22.6-2.4 44-6.1 63.6-11 2.3 10.1 4.1 19.8 5.2 29.1zm38.5-66.7c-8.6 3.7-18 7-27.7 10.1-5.7-19.6-13.2-40-22.5-60.9 9.2-20.8 16.6-41.1 22.2-60.6 9.9 3.1 19.3 6.5 28.1 10.2 35.4 15.1 58.3 34.9 58.3 50.6-.1 15.7-23 35.6-58.4 50.6zM320.8 78.4z" />
              <circle cx="420.9" cy="296.5" r="45.7" />
              <path d="M520.5 78.1z" />
            </g>
          </svg>
        </div>
      </modal>
    ) : <div />
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
          disableDetails={true}
        />
        <MultiEdit
          testMultiEdit={this.multiEdit}
        />
        {logo}
        {viewArea}
      </div>
    );
  }
}

export default App;