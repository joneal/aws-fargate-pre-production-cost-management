// NOTE: Set Lambda timeout to at least 60 seconds
const AWS = require('aws-sdk');

AWS.config.region = 'us-east-1';

const ecs = new AWS.ECS({ apiVersion: '2014-11-13' });
const sns = new AWS.SNS({ apiVersion: '2016-11-15' });

// ARN of the SNS topic to get generate exceptions
const TOPIC_INFORMATION_ARN = 'arn:aws:sns:us-east-1:[your AWS account number]:[some SNS Topic for notificatoins]';

const FARGATE_CLUSTERS = [
    {
        name: "ecs-dev",
        services: [
            { name: "task1", desiredCount: 2, enabled: true },
            { name: "task2", desiredCount: 4, enabled: true },
            { name: "task3", desiredCount: 2, enabled: false }            
        ]
    },
    {
        name: "ecs-stage",
        services: [
            { name: "task1", desiredCount: 2, enabled: true },
            { name: "task2", desiredCount: 4, enabled: true },
            { name: "task3", desiredCount: 2, enabled: false }
        ]
    }
];

async function main(event) {
    try {
        console.log('Received Fargate preprod event ' + event.action);

        if (event.action != 'startup' && event.action != 'shutdown') {
            throw new Error('Received invalid Fargate preprod event action [' + event.action + ']');
        }

        await manageServiceTasks(event.action);

    } catch (err) {
        console.log(err.stack);

        await sns.publish({
            Message: err.stack,
            Subject: 'Manage preprod Fargate EXCEPTION',
            TopicArn: TOPIC_INFORMATION_ARN
        }).promise();
    }
};

async function manageServiceTasks(action) {
    for (var i = 0; i < FARGATE_CLUSTERS.length; i++) {
        let cluster = FARGATE_CLUSTERS[i];
        for (var k = 0; k < FARGATE_CLUSTERS[i].services.length; k++) {
            let service = FARGATE_CLUSTERS[i].services[k];
            if (service.enabled) {
                try {
                    await ecs.updateService({
                        cluster: cluster.name,
                        service: service.name,
                        desiredCount: (action == 'startup') ? service.desiredCount : 0
                    }).promise();
                } catch (err) {
                    console.log(err.stack);
                    await sns.publish({
                        Message: 'Cluster: ' + cluster.name + '\n' + 'Service: ' + service.name + '\n\n' + err.stack,
                        Subject: 'Manage preprod Fargate EXCEPTION',
                        TopicArn: TOPIC_INFORMATION_ARN
                    }).promise();
                }
            }
        }
    }
}

exports.handler = async (event) => {
    await main(event);
};
