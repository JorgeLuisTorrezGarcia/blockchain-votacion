// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title VotingSystem - Módulo base para gestionar elecciones en una dApp de votación
/// @notice Contrato simplificado para un MVP: maneja elecciones con lista blanca, sin medidas avanzadas de seguridad
contract VotingSystem {
    struct Election {
        string title;
        string description;
        uint64 startTime;
        uint64 endTime;
        address creator;
        bool finalized;
        string[] options;
        uint256[] voteCounts;
    }

    uint256 public electionCount;
    mapping(uint256 => Election) private elections;
    mapping(uint256 => mapping(address => bool)) private authorizedVoters;
    mapping(uint256 => mapping(address => bool)) private hasVoted;

    event ElectionCreated(uint256 indexed electionId, address indexed creator, uint64 startTime, uint64 endTime);
    event VotersAuthorized(uint256 indexed electionId, address[] voters);
    event VoteCast(uint256 indexed electionId, address indexed voter, uint256 optionIndex);

    modifier electionExists(uint256 electionId) {
        require(elections[electionId].creator != address(0), "ELECTION_NOT_FOUND");
        _;
    }

    modifier onlyCreator(uint256 electionId) {
        require(elections[electionId].creator == msg.sender, "ONLY_CREATOR");
        _;
    }

    /// @notice Crea una nueva elección
    /// @param title Título visible para los votantes
    /// @param description Descripción corta
    /// @param startTime Timestamp de inicio (si es 0 comienza inmediatamente)
    /// @param endTime Timestamp de fin (si es 0 no tiene fin definido)
    /// @param optionLabels Opciones disponibles para votar (mínimo 2)
    /// @param initialVoters Lista blanca inicial de votantes autorizados
    /// @return electionId Identificador incremental de la elección
    function createElection(
        string memory title,
        string memory description,
        uint64 startTime,
        uint64 endTime,
        string[] memory optionLabels,
        address[] memory initialVoters
    ) external returns (uint256 electionId) {
        require(bytes(title).length > 0, "TITLE_REQUIRED");
        require(optionLabels.length >= 2, "OPTIONS_TOO_SHORT");

        uint64 start = startTime == 0 ? uint64(block.timestamp) : startTime;
        uint64 end = endTime;
        require(end == 0 || end > start, "INVALID_WINDOW");

        electionId = ++electionCount;
        Election storage election = elections[electionId];
        election.title = title;
        election.description = description;
        election.startTime = start;
        election.endTime = end;
        election.creator = msg.sender;
        election.options = optionLabels;
        election.voteCounts = new uint256[](optionLabels.length);

        _authorizeVoters(electionId, initialVoters);

        emit ElectionCreated(electionId, msg.sender, start, end);
        if (initialVoters.length > 0) {
            emit VotersAuthorized(electionId, initialVoters);
        }
    }

    /// @notice Agrega votantes a la lista blanca antes de iniciar la elección
    function authorizeVoters(uint256 electionId, address[] memory voters)
        external
        electionExists(electionId)
        onlyCreator(electionId)
    {
        Election storage election = elections[electionId];
        require(block.timestamp < election.startTime, "ELECTION_ALREADY_STARTED");

        _authorizeVoters(electionId, voters);
        if (voters.length > 0) {
            emit VotersAuthorized(electionId, voters);
        }
    }

    /// @notice Emite un voto para una opción de la elección indicada
    function vote(uint256 electionId, uint256 optionIndex)
        external
        electionExists(electionId)
    {
        Election storage election = elections[electionId];
        require(block.timestamp >= election.startTime, "ELECTION_NOT_STARTED");
        if (election.endTime != 0) {
            require(block.timestamp <= election.endTime, "ELECTION_FINISHED");
        }
        require(authorizedVoters[electionId][msg.sender], "NOT_AUTHORIZED");
        require(!hasVoted[electionId][msg.sender], "ALREADY_VOTED");
        require(optionIndex < election.options.length, "INVALID_OPTION");

        hasVoted[electionId][msg.sender] = true;
        election.voteCounts[optionIndex] += 1;

        emit VoteCast(electionId, msg.sender, optionIndex);
    }

    /// @notice Obtiene toda la información pública de la elección
    function getElection(uint256 electionId)
        external
        view
        electionExists(electionId)
        returns (
            string memory title,
            string memory description,
            uint64 startTime,
            uint64 endTime,
            address creator,
            string[] memory options,
            uint256[] memory voteCounts
        )
    {
        Election storage election = elections[electionId];
        return (
            election.title,
            election.description,
            election.startTime,
            election.endTime,
            election.creator,
            election.options,
            election.voteCounts
        );
    }

    /// @notice Devuelve si el usuario está autorizado para votar en la elección
    function isAuthorized(uint256 electionId, address account)
        external
        view
        electionExists(electionId)
        returns (bool)
    {
        return authorizedVoters[electionId][account];
    }

    /// @notice Verifica si la cuenta ya votó en la elección
    function hasAccountVoted(uint256 electionId, address account)
        external
        view
        electionExists(electionId)
        returns (bool)
    {
        return hasVoted[electionId][account];
    }

    function _authorizeVoters(uint256 electionId, address[] memory voters) internal {
        mapping(address => bool) storage votersMap = authorizedVoters[electionId];
        for (uint256 i = 0; i < voters.length; i++) {
            address voter = voters[i];
            require(voter != address(0), "INVALID_VOTER");
            votersMap[voter] = true;
        }
    }
}
