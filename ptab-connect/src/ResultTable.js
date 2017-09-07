//@flow

import React from 'react';
import type {resultSet } from './typedefs';


const ResultTable = (props: {
  records: Array<resultSet>
}) => {
  return (
    <div className="ResultTable">
      <table>
        <thead>
          <tr>
            <th>IPR</th>
            <th>Date Filed</th>
            <th>Status</th>
            <th>FWD Status</th>
            <th>Petitioner</th>
            <th>Patent Owner</th>
            <th>Patent:Claim</th>
            <th>Main USPC</th>
            <th>Instituted</th>
            <th>Invalid</th>
          </tr>
        </thead>
        <tbody>
          {props.records.map(record =>
            <tr key={record.ID}>
              <td>{record.IPR}</td>
              <td>{record.DateFiled}</td>
              <td>{record.Status}</td>
              <td>{record.FWDStatus}</td>
              <td>{record.Petitioner}</td>
              <td>{record.PatentOwner}</td>
              <td>{record.Patent} Clm {record.Claim}</td>
              <td>{record.MainUSPC}</td>
              <td>{record.Instituted === '1' ? 'x' : ''}</td>
              <td>{record.Invalid === '1' ? 'x' : ''}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default ResultTable;