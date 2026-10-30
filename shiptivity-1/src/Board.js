
import React from 'react';
import Dragula from 'dragula';
import 'dragula/dist/dragula.css';
import Swimlane from './Swimlane';
import './Board.css';

const API_URL = 'http://localhost:3001/api/v1/clients';

const STATUSES = {
  backlog: 'backlog',
  inProgress: 'in-progress',
  complete: 'complete',
};

export default class Board extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      clients: {
        backlog: [],
        inProgress: [],
        complete: [],
      },
      loading: true,
      error: null,
    };

    this.swimlanes = {
      backlog: React.createRef(),
      inProgress: React.createRef(),
      complete: React.createRef(),
    };

    this.drake = null;
    this.isMountedFlag = false;
    this.isSaving = false;
  }

  componentDidMount() {
    this.isMountedFlag = true;
    this.initializeDragula();
    this.fetchClients();
  }

  componentWillUnmount() {
    this.isMountedFlag = false;

    if (this.drake) {
      this.drake.destroy();
    }
  }

  // Convert the API response into three ordered swimlanes.
  organizeClients = (clients) => {
    const lanes = {
      backlog: [],
      inProgress: [],
      complete: [],
    };

    clients.forEach(client => {
      if (client.status === 'backlog') {
        lanes.backlog.push(client);
      } else if (client.status === 'in-progress') {
        lanes.inProgress.push(client);
      } else if (client.status === 'complete') {
        lanes.complete.push(client);
      }
    });

    Object.keys(lanes).forEach(key => {
      lanes[key].sort((a, b) => a.priority - b.priority);
    });

    return lanes;
  };

  // Load clients from the backend instead of hardcoded data.
  fetchClients = async () => {
    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error('Failed to load clients.');
      }

      const clients = await response.json();

      if (this.isMountedFlag) {
        this.setState({
          clients: this.organizeClients(clients),
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Error fetching clients:', error);

      if (this.isMountedFlag) {
        this.setState({
          loading: false,
          error: 'Could not load clients. Check that the backend is running.',
        });
      }
    }
  };

  initializeDragula = () => {
    const backlog = this.swimlanes.backlog.current;
    const inProgress = this.swimlanes.inProgress.current;
    const complete = this.swimlanes.complete.current;

    if (!backlog || !inProgress || !complete) {
      console.error('Could not find swimlane containers.');
      return;
    }

    this.drake = Dragula(
      [backlog, inProgress, complete],
      {
        moves: () => !this.isSaving && !this.state.loading,
      }
    );

    this.drake.on('drop', this.handleDrop);
  };

  handleDrop = async (element, target, source) => {
    if (!target || !source || this.isSaving) {
      return;
    }

    const laneKeys = ['backlog', 'inProgress', 'complete'];

    const laneElements = laneKeys.map(
      key => this.swimlanes[key].current
    );

    const sourceIndex = laneElements.indexOf(source);
    const targetIndex = laneElements.indexOf(target);

    if (sourceIndex === -1 || targetIndex === -1) {
      return;
    }

    const sourceKey = laneKeys[sourceIndex];
    const targetKey = laneKeys[targetIndex];

    const previousClients = this.state.clients;

    // HTML data attributes are strings; API IDs are numbers.
    const clientId = Number(element.getAttribute('data-client-id'));

    const oldIndex = previousClients[sourceKey].findIndex(
      client => client.id === clientId
    );

    const newIndex = Array.from(target.children).indexOf(element);

    if (oldIndex === -1 || newIndex === -1) {
      console.error('Could not identify the dragged card.');
      this.drake.cancel(true);
      return;
    }

    // Restore the DOM to the position React last rendered.
    // This avoids conflicts between Dragula and React.
    if (source === target) {
      const originalNext = source.children[oldIndex];

      if (originalNext !== element) {
        source.insertBefore(element, originalNext || null);
      }
    } else {
      const originalNext = source.children[oldIndex];
      source.insertBefore(element, originalNext || null);
    }

    if (sourceKey === targetKey && oldIndex === newIndex) {
      return;
    }

    // Create new arrays without modifying existing React state.
    const updatedClients = {
      backlog: [...previousClients.backlog],
      inProgress: [...previousClients.inProgress],
      complete: [...previousClients.complete],
    };

    const [movedClient] = updatedClients[sourceKey].splice(
      oldIndex,
      1
    );

    updatedClients[targetKey].splice(newIndex, 0, {
      ...movedClient,
      status: STATUSES[targetKey],
    });

    // Update the UI immediately.
    this.isSaving = true;

    this.setState({
      clients: updatedClients,
      error: null,
    });

    try {
      // Save the new status and position in SQLite.
      const response = await fetch(`${API_URL}/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: STATUSES[targetKey],
          priority: newIndex + 1,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save card position.');
      }

      const savedClients = await response.json();

      // Display the exact order saved by the backend.
      if (this.isMountedFlag) {
        this.setState({
          clients: this.organizeClients(savedClients),
          error: null,
        });
      }
    } catch (error) {
      console.error('Error updating client:', error);

      // Reload the database state to undo an unsuccessful move.
      await this.fetchClients();

      if (this.isMountedFlag) {
        this.setState({
          error: 'Could not save the card movement. Please try again.',
        });
      }
    } finally {
      this.isSaving = false;
    }
  };

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
        {this.state.error && (
          <div className="alert alert-danger" role="alert">
            {this.state.error}
          </div>
        )}

        {this.state.loading && (
          <p>Loading clients...</p>
        )}

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
