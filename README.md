# AWS Fargate pre-production cost management

Using a framework of AWS services, a solution to schedule the shutdown of pre-production Fargate ECS tasks when not in use can be achieved, yielding potentially significant cost savings. The pre-production tasks are usually associated with development/test/stage environments which in many scenarios these tasks can be terminated during non-development hours. These tasks can be scheduled to start just before being required by developers during normal business hours, and scheduled to terminate as developers leave for the day.

### Architecture

AWS CloudWatch and Lambda are used to manage pre-production Fargate tasks.

Two CloudWatch scheduled events are used to trigger invocations of a single Lambda function at different times. One CloudWatch scheduled event is used to trigger the Lambda function in the morning before developers require the pre-production Fargate tasks for their daily development/debugging activities. This CloudWatch event uses a CRON string to schedule the event for the morning hours during the week (Monday - Friday). The CloudWatch event passes an action value of "startup" to the Lambda function to indicate to the function that it should perform Fargate tasks startup actions.

The Lambda function manages the Fargate service using the AWS SDK for ECS. It specifically calls the "updateService" SDK function to set the [number of tasks for each service](https://jdo-github-images.s3.amazonaws.com/aws-fargate-pre-prod-startup.png), as specified within the Lambda function source code.

The other CloudWatch scheduled event is used to trigger the Lambda function in the evening after developers are done with their need of the pre-production Fargate tasks for the day. This CloudWatch event uses a CRON string to schedule the event for the evening hours during the week (Monday - Friday). The CloudWatch event passes an action value of "shutdown" to the Lambda function to indicate to the function that it should perform Fargate tasks shutdown actions.

The Lambda function calls the "updateService" SDK function with the [number of tasks set to zero for each ECS service](https://jdo-github-images.s3.amazonaws.com/aws-fargate-pre-prod-shutdown.png). This causes Fargate to gracefully shut down all specified tasks.

Note that the Fargate tasks remain terminated over the weekend.

An AWS CloudFormation template contains all required components for building a stack to support the CloudWatch scheduled events and the Lambda function. This template also includes the required IAM role and policy for the Lambda function to access ECS (Fargate), CloudWatch logging, and SNS for exception notification.

The CloudFormation template creates an empty NodeJS handler function. The function source code, in NodeJS, is managed in a separate file. The contents of this file should be copied over the empty function code.

Users are prompted for the CRON strings for task startup and shutdown times when the CloudFormation template is created. These values can also be changed with a CloudFormation "update" template action.

