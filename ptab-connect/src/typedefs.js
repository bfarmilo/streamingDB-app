export type resultSet = {
  ID: number,
  IPR: string,
  DateFiled: string,
  Status: string,
  FWDStatus: string,
  Petitioner: string,
  PatentOwner: string,
  Patent: number,
  Claim: number,
  MainUSPC: string,
  Instituted: boolean,
  Invalid: boolean
}

export type survivalStats = {
  type: string,
  count: number
}