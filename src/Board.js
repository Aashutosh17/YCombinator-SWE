
import React from 'react';
import Dragula from 'dragula';
import 'dragula/dist/dragula.css';
import Swimlane from './Swimlane';
import './Board.css';

export default class Board extends React.Component {
  constructor(props) {
    super(props);

    // All clients start in Backlog.
    const clients = this.getClients().map(client => ({
      ...client,
      status: 'backlog',
    }));

    this.state = {
      clients: {
        backlog: clients,
        inProgress: [],
        complete: [],
      },
    };

    // References to the three swimlane containers.
    this.swimlanes = {
      backlog: React.createRef(),
      inProgress: React.createRef(),
      complete: React.createRef(),
    };

    this.drake = null;
  }

  componentDidMount() {
    const backlog = this.swimlanes.backlog.current;
    const inProgress = this.swimlanes.inProgress.current;
    const complete = this.swimlanes.complete.current;

    if (!backlog || !inProgress || !complete) {
      console.error('Could not find swimlane containers.');
      return;
    }

    const containers = [backlog, inProgress, complete];

    // Enable drag and drop between all three columns.
    this.drake = Dragula(containers);

    // Update React state whenever a card is dropped.
    this.drake.on('drop', (element, target, source) => {
      if (!target || !source) return;

      const laneKeys = ['backlog', 'inProgress', 'complete'];
      const laneElements = [
        this.swimlanes.backlog.current,
        this.swimlanes.inProgress.current,
        this.swimlanes.complete.current,
      ];

      const sourceIndex = laneElements.indexOf(source);
      const targetIndex = laneElements.indexOf(target);

      if (sourceIndex === -1 || targetIndex === -1) return;

      const sourceKey = laneKeys[sourceIndex];
      const targetKey = laneKeys[targetIndex];

      // Find the card's original position.
      const oldClients = this.state.clients;
      const sourceClients = oldClients[sourceKey];
      const oldIndex = sourceClients.findIndex(client =>
        client.id === element.getAttribute('data-client-id')
      );

      if (oldIndex === -1) {
        console.error('Could not identify dragged client.');
        return;
      }

      // Get the card's new position in the target container.
      const newIndex = Array.from(target.children).indexOf(element);

      if (newIndex === -1) return;

      // Restore the DOM before React updates it.
      // React must remain responsible for rendering card positions.
      if (source === target) {
        const originalNext = source.children[oldIndex];

        if (originalNext !== element) {
          source.insertBefore(element, originalNext || null);
        }
      } else {
        const originalNext = source.children[oldIndex];
        source.insertBefore(element, originalNext || null);
      }

      // Create new arrays to avoid mutating React state.
      const updatedClients = {
        backlog: [...oldClients.backlog],
        inProgress: [...oldClients.inProgress],
        complete: [...oldClients.complete],
      };

      // Remove the client from its old position.
      const [movedClient] = updatedClients[sourceKey].splice(oldIndex, 1);

      // Update its status.
      const statuses = {
        backlog: 'backlog',
        inProgress: 'in-progress',
        complete: 'complete',
      };

      const updatedClient = {
        ...movedClient,
        status: statuses[targetKey],
      };

      // Insert the client into its new position.
      updatedClients[targetKey].splice(newIndex, 0, updatedClient);

      this.setState({
        clients: updatedClients,
      });
    });
  }

  componentWillUnmount() {
    if (this.drake) {
      this.drake.destroy();
    }
  }

  getClients() {
    return [
      ['1', 'Stark, White and Abbott', 'Cloned Optimal Architecture', 'in-progress'],
      ['2', 'Wiza LLC', 'Exclusive Bandwidth-Monitored Implementation', 'complete'],
      ['3', 'Nolan LLC', 'Vision-Oriented 4Thgeneration Graphicaluserinterface', 'backlog'],
      ['4', 'Thompson PLC', 'Streamlined Regional Knowledgeuser', 'in-progress'],
      ['5', 'Walker-Williamson', 'Team-Oriented 6Thgeneration Matrix', 'in-progress'],
      ['6', 'Boehm and Sons', 'Automated Systematic Paradigm', 'backlog'],
      ['7', 'Runolfsson, Hegmann and Block', 'Integrated Transitional Strategy', 'backlog'],
      ['8', 'Schumm-Labadie', 'Operative Heuristic Challenge', 'backlog'],
      ['9', 'Kohler Group', 'Re-Contextualized Multi-Tasking Attitude', 'backlog'],
      ['10', 'Romaguera Inc', 'Managed Foreground Toolset', 'backlog'],
      ['11', 'Reilly-King', 'Future-Proofed Interactive Toolset', 'complete'],
      ['12', 'Emard, Champlin and Runolfsdottir', 'Devolved Needs-Based Capability', 'backlog'],
      ['13', 'Fritsch, Cronin and Wolff', 'Open-Source 3Rdgeneration Website', 'complete'],
      ['14', 'Borer LLC', 'Profit-Focused Incremental Orchestration', 'backlog'],
      ['15', 'Emmerich-Ankunding', 'User-Centric Stable Extranet', 'in-progress'],
      ['16', 'Willms-Abbott', 'Progressive Bandwidth-Monitored Access', 'in-progress'],
      ['17', 'Brekke PLC', 'Intuitive User-Facing Customerloyalty', 'complete'],
      ['18', 'Bins, Toy and Klocko', 'Integrated Assymetric Software', 'backlog'],
      ['19', 'Hodkiewicz-Hayes', 'Programmable Systematic Securedline', 'backlog'],
      ['20', 'Murphy, Lang and Ferry', 'Organized Explicit Access', 'backlog'],
    ].map(companyDetails => ({
      id: companyDetails[0],
      name: companyDetails[1],
      description: companyDetails[2],
      status: companyDetails[3],
    }));
  }

  renderSwimlane(name, clients, ref) {
    return (
      <Swimlane
        name={name}
        clients={clients}
        dragulaRef={ref}
      />
    );
  }

  render() {
    return (
      <div className="Board">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-4">
              {this.renderSwimlane(
                'Backlog',
                this.state.clients.backlog,
                this.swimlanes.backlog
              )}
            </div>

            <div className="col-md-4">
              {this.renderSwimlane(
                'In Progress',
                this.state.clients.inProgress,
                this.swimlanes.inProgress
              )}
            </div>

            <div className="col-md-4">
              {this.renderSwimlane(
                'Complete',
                this.state.clients.complete,
                this.swimlanes.complete
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
