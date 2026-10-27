// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CertificateRegistry {

    // Structure for storing certificate information
    struct Certificate {
        string certificateId;
        string studentName;
        string course;
        string certificateHash;
        string ipfsCID;
        uint256 issueDate;
        bool exists;
    }

    // Mapping certificate ID → certificate
    mapping(string => Certificate) private certificates;

    // Event emitted when a certificate is issued
    event CertificateIssued(
        string certificateId,
        string certificateHash,
        string ipfsCID
    );

    // Issue a new certificate
    function issueCertificate(
        string memory _certificateId,
        string memory _studentName,
        string memory _course,
        string memory _certificateHash,
        string memory _ipfsCID
    ) public {

        // Make sure the certificate ID is not already registered
        require(
            !certificates[_certificateId].exists,
            "Certificate already exists"
        );

        // Store certificate on blockchain
        certificates[_certificateId] = Certificate({
            certificateId: _certificateId,
            studentName: _studentName,
            course: _course,
            certificateHash: _certificateHash,
            ipfsCID: _ipfsCID,
            issueDate: block.timestamp,
            exists: true
        });

        // Emit event
        emit CertificateIssued(
            _certificateId,
            _certificateHash,
            _ipfsCID
        );
    }

    // Verify / retrieve a certificate
    function verifyCertificate(
        string memory _certificateId
    )
        public
        view
        returns (
            string memory,
            string memory,
            string memory,
            string memory,
            string memory,
            uint256
        )
    {
        // Make sure certificate exists
        require(
            certificates[_certificateId].exists,
            "Certificate does not exist"
        );

        Certificate memory cert = certificates[_certificateId];

        return (
            cert.certificateId,
            cert.studentName,
            cert.course,
            cert.certificateHash,
            cert.ipfsCID,
            cert.issueDate
        );
    }
}