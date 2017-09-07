import React from 'react'

const MultiEdit = (props: {
  testMultiEdit: (() => Event)
}) => {
  const button = <button onClick={props.testMultiEdit}>Test MultiEdit</button>;
  return (
    <div>
      
    </div>
  )
}

export default MultiEdit;