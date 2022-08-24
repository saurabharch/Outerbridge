import {
    ICommonObject,
	INode, 
    INodeData, 
    INodeExecutionData, 
    INodeOptionsValue, 
    INodeParams, 
    NodeType,
} from '../../src/Interface';
import {
	handleErrorMessage,
    returnNodeExecutionData,
	serializeQueryParams
} from '../../src/utils';
import axios, { AxiosRequestConfig, AxiosRequestHeaders, Method } from 'axios';

class HTTP implements INode {

    label: string;
    name: string;
    type: NodeType;
    description?: string;
    version: number;
	icon?: string;
    incoming: number;
	outgoing: number;
    actions?: INodeParams[];
    credentials?: INodeParams[];
    inputParameters?: INodeParams[];

    constructor() {
		this.label = 'HTTP';
		this.name = 'http';
		this.icon = 'http.svg';
		this.type = 'action';
		this.version = 1.0;
		this.description = 'Execute HTTP request';
		this.incoming = 1;
        this.outgoing = 1;
        this.actions = [
            {
				label: 'Method',
				name: 'method',
				type: 'options',
				options: [
                    {
						label: 'GET',
						name: 'GET'
					},
                    {
						label: 'POST',
						name: 'POST'
					},
					{
						label: 'PUT',
						name: 'PUT'
					},
					{
						label: 'DELETE',
						name: 'DELETE'
					},
					{
						label: 'HEAD',
						name: 'HEAD'
					},
				],
				default: 'GET',
				description: 'HTTP method',
			}
        ] as INodeParams[];
		this.credentials = [
            {
				label: 'Authorization',
				name: 'credentialMethod',
				type: 'options',
				options: [
					{
						label: 'Basic Auth',
						name: 'httpBasicAuth',
					},
                    {
						label: 'Bearer Token Auth',
						name: 'httpBearerTokenAuth',
					},
                    {
						label: 'No Auth',
						name: 'noAuth',
                        hideRegisteredCredential: true
					},
				],
				default: 'noAuth',
			},
			
		] as INodeParams[];
		this.inputParameters = [
			{
				label: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'http://<your-url>.com/',
			},
			{
				label: 'Headers',
				name: 'headers',
				type: 'array',
                array: [
					{
						label: 'Key',
						name: 'key',
						type: 'string',
						default: '',
					},
                    {
						label: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
                ],
                optional: true,
			},
            {
				label: 'Query Params',
				name: 'queryParams',
				type: 'array',
				array: [
					{
						label: 'Key',
						name: 'key',
						type: 'string',
						default: '',
					},
                    {
						label: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
                ],
                optional: true,
			},
			{
				label: 'Body Type',
				name: 'bodyType',
				type: 'options',
				options: [
					{
						label: 'JSON',
						name: 'json',
					},
                    {
						label: 'Text',
						name: 'text',
					},
					{
						label: 'GraphQL',
						name: 'graphQL',
						show: {
							'actions.method': ['POST']
						}
					},
				],
				default: 'json',
                optional: true,
			},
            {
				label: 'JSON Body',
				name: 'body',
				type: 'json',
                show: {
                    'inputParameters.bodyType': ['json']
                },
                default: '{}',
                optional: true,
            },
			{
				label: 'Text Body',
				name: 'body',
				type: 'string',
                show: {
                    'inputParameters.bodyType': ['text']
                },
                default: '',
                optional: true,
            },
            {
				label: 'GraphQL Body',
				name: 'body',
				type: 'string',
				rows: 10,
                show: {
                    'inputParameters.bodyType': ['graphQL']
                },
                default: '',
                optional: true,
            },
		]
	};


	async run(nodeData: INodeData): Promise<INodeExecutionData[] | null> {

        const actionData = nodeData.actions;
        const inputParametersData = nodeData.inputParameters;
		const credentials = nodeData.credentials;

		if (actionData === undefined || inputParametersData === undefined || credentials === undefined) {
            throw new Error('Required data missing');
        }

		const method = actionData.method as string;

        const credentialMethod = credentials.credentialMethod as string;

        const url = inputParametersData.url as string;
        const headers = inputParametersData.headers as ICommonObject[] || [];
        const queryParams = inputParametersData.queryParams as ICommonObject[] || [];
        const bodyType = inputParametersData.bodyType as string;
        const body = inputParametersData.body as string;

        const returnData: ICommonObject = {};

        try {
            let queryParameters: ICommonObject = {};
            let queryHeaders: AxiosRequestHeaders = {};
            let data: any = {};

            for (const params of queryParams) {
				const key = params.key as string;
				const value = params.value as string;
				if (key) queryParameters[key] = value;
            }

            for (const header of headers) {
				const key = header.key as string;
				const value = header.value as string;
				if (key) queryHeaders[key] = value;
            }

            if (bodyType && bodyType === 'json' && body) {
                data = JSON.parse(body);

            } else if (bodyType && bodyType === 'text' && body) {
                data = body;

            } else if (bodyType && bodyType === 'graphQL' && body) {
                data = { query : body.replace(/\s/g, ' ') }
            }

            if (credentialMethod === 'httpBearerTokenAuth') {
                queryHeaders['Authorization'] = `Bearer ${credentials!.token}`;
            }

            const axiosConfig: AxiosRequestConfig = {
                method: method as Method,
                url,
            }

			if (Object.keys(data).length) {
				axiosConfig.data = data;
			}

			if (Object.keys(queryParameters).length) {
				axiosConfig.params = queryParameters;
				axiosConfig.paramsSerializer = params => serializeQueryParams(params);
			}

			if (Object.keys(queryHeaders).length) {
				axiosConfig.headers = queryHeaders;
			}

            if (credentialMethod === 'httpBasicAuth') {
                axiosConfig.auth = {
                    username: credentials!.userName as string,
                    password: credentials!.password as string
                }
            }

            const response = await axios(axiosConfig);
            returnData['data'] = response.data;	
            returnData['status'] = response.status;
            returnData['statusText'] = response.statusText;
            returnData['headers'] = response.headers;
        }
        catch (error) {
            throw handleErrorMessage(error);
        }

        return returnNodeExecutionData(returnData);

	}
}

module.exports = { nodeClass: HTTP }
