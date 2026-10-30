import React from "react";
import Card from "./Card";
import "./Swimlane.css";

export default class Swimlane extends React.Component {
  render() {
    const cards = this.props.clients.map((client) => {
      return (
        <div key={client.id} data-client-id={client.id}>
          <Card
            id={client.id}
            name={client.name}
            description={client.description}
            status={client.status}
          />
        </div>
      );
    });

    return (
      <div className="Swimlane-column">
        <div className="Swimlane-title">{this.props.name}</div>

        <div className="Swimlane-dragColumn" ref={this.props.dragulaRef}>
          {cards}
        </div>
      </div>
    );
  }
}
