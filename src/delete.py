import todoList


def delete(event, context):
    todoList.delete_item(event['pathParameters']['id'])

    # create a response
    response = {
        "statusCode": 200,
        "headers": {"Access-Control-Allow-Origin": "*"}
    }

    return response
