# React Video List Application

This project is a React application that displays a list of videos with search and pagination functionality. The application is dockerized and can be run using Docker Compose.

## Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

Ensure you have the following installed on your machine:

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) (for local development)

### Installation

1. Create a `.env` file in the root directory and add the following environment variables:

    ```env
    REACT_APP_API_URL=http://localhost:3000
    REACT_APP_USERNAME=admin
    REACT_APP_PASSWORD=password
    ```

### Running the Application

You can run the application using Docker Compose.

1. Build and start the Docker containers:

    ```bash
    docker-compose up --build
    ```

2. Open your browser and navigate to `http://localhost:8080` to see the application running.

### Environment Variables

The application uses environment variables to configure the API URL and authentication credentials. These variables are defined in the `.env` file. The following variables are required:

- `REACT_APP_API_URL`: The base URL of the API.
- `REACT_APP_USERNAME`: The username for API authentication.
- `REACT_APP_PASSWORD`: The password for API authentication.
