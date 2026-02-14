import json
import decimalencoder
import todoList


def list(event, context):
    # fetch all todos from the database
    result = todoList.get_items()
    # create a response
    response = {
        "statusCode": 200,
        "headers": {"Access-Control-Allow-Origin": "*"},
        "body": json.dumps(result, cls=decimalencoder.DecimalEncoder)
    }
    return response
