import 'reflect-metadata';
import { getDatabase } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ApiPostBody, ConfigurationMongoContent, RouteParams } from './types';
import { SchemaBindingMongoContent } from '@/app/api/configurations/schema/[hash]/[configurationId]/types';
import { Validator } from 'jsonschema';
import { getJWT } from '@/lib/auth';

/**
 * @swagger
 * /api/configurations/content/{vehicleId}/{deviceId}/{configurationId}:
 *   get:
 *     summary: Get configuration content
 *     description: Get configuration content
 *     tags: [Configurations]
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         schema:
 *           type: string
 *         required: true
 *       - in: path
 *         name: deviceId
 *         schema:
 *           type: string
 *         required: true
 *       - in: path
 *         name: configurationId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Ok. Response correctly sent the configuration content
 *         headers:
 *           Content-Type:
 *             description: Content type of the response
 *             value: application/json
 *           Last-Modified:
 *             description: Last modification date of the configuration
 *         content:
 *           application/json:
 *             description: Contains the configuration content with additional informations about creation date, last update date and last update author
 *             schema:
 *               type: object
 *               properties:
 *                 vehicleId:
 *                   type: string 
 *                   description: Vehicle ID 
 *                 deviceId:
 *                   type: string 
 *                   description: Device ID
 *                 configurationId:
 *                   type: string 
 *                   description: Configuration ID 
 *                 configurationVersionHash: 
 *                   type: string 
 *                   description: Configuration version hash 
 *                 content:
 *                   type: object
 *                   description: Configuration content 
 *                 updatedBy:
 *                   type: string 
 *                   description: Email of the user who last updated the configuration 
 *                 lastUpdate: 
 *                   type: string 
 *                   description: Last update date of the configuration. UTF format
 *             example: 
 *               vehicleId: vehicle 
 *               deviceId: device
 *               configurationId: configuration  
 *               configurationVersionHash: 0123456789abcdef0123456789abcdef01234567
 *               content:
 *                 key: 123
 *                 key2: value2
 *               updatedBy: someone@domain.tld
 *               lastUpdate: Wed, 21 Oct 2015 07:28:00 GMT
 *       401:
 *         description: Unauthorized. Probably missing or invalid JWT token
 *       404:
 *         description: Not found. Configuration cannot be found
 *       500:
 *         description: Internal Server Error. Something went wrong on the server side
 */
export async function GET(
  req: NextRequest,
  { params }: { params: RouteParams }
): Promise<NextResponse> {
  const token = await getJWT(req);
  if (!token) {
    return new NextResponse(null, { status: 401 });
  }

  const db = await getDatabase();
  const collection = db.collection('configurations');

  const result = await collection.findOne({
    vehicleId: params.vehicleId,
    deviceId: params.deviceId,
    configurationId: params.configurationId,
  });

  if (!result) {
    return new NextResponse(null, { status: 404 });
  }

  const config = plainToInstance(ConfigurationMongoContent, result);
  const errors = await validate(config);
  if (errors.length > 0) {
    return new NextResponse(null, { status: 500 });
  }

  return new NextResponse(JSON.stringify(config), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Last-Modified': config.lastUpdate,
    },
  });
}

/**
 * @swagger
 * /api/configurations/content/{vehicleId}/{deviceId}/{configurationId}:
 *   head:
 *     summary: Fetch last modification date of the configuration
 *     description: HEAD request must be used for checking if the configuration has been modified since the last time it has been downloaded with GET method. If the configuration has been modified, the GET method must be used to download the new version of the configuration, if user accepts it.
 *     tags: [Configurations]
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         schema:
 *           type: string
 *         required: true
 *       - in: path
 *         name: deviceId
 *         schema:
 *           type: string
 *         required: true
 *       - in: path
 *         name: configurationId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Ok. Response correctly sent the configuration content
 *         headers:
 *           Last-Modified:
 *             description: Last modification date of the configuration
 *       401:
 *         description: Unauthorized. Probably missing or invalid JWT token
 *       404:
 *         description: Not found. Configuration cannot be found
 *       500:
 *         description: Internal Server Error. Something went wrong on the server side
 */
export async function HEAD(
  req: NextRequest,
  { params }: { params: RouteParams }
): Promise<NextResponse> {
  const token = await getJWT(req);
  if (!token) {
    return new NextResponse(null, { status: 401 });
  }

  const db = await getDatabase();
  const collection = await db.collection('configurations');

  const result = await collection.findOne({
    vehicleId: params.vehicleId,
    deviceId: params.deviceId,
    configurationId: params.configurationId,
  });

  if (!result) {
    return new NextResponse(null, { status: 404 });
  }

  const config = plainToInstance(ConfigurationMongoContent, result);
  const errors = await validate(config);
  if (errors.length > 0) {
    return new NextResponse(null, { status: 500 });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Last-Modified': config.lastUpdate,
      'X-VehicleId': config.vehicleId,
      'X-DeviceId': config.deviceId,
      'X-ConfigurationId': config.configurationId,
      'X-ConfigurationVersionHash': config.configurationVersionHash,
    },
  });
}

/**
 * @swagger
 * /api/configurations/content/{vehicleId}/{deviceId}/{configurationId}:
 *   post:
 *     summary: Save configuration on the cloud
 *     description: After the configuration has been validated against the schema, it can be saved on the cloud. The configuration will overwrite the previous version of the configuration.
 *     tags: [Configurations]
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         schema:
 *           type: string
 *         required: true
 *       - in: path
 *         name: deviceId
 *         schema:
 *           type: string
 *         required: true
 *       - in: path
 *         name: configurationId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       description: Body must contain a valid configuration, that will be validated against the schema. Must be a valid JSON object.
 *       required: true
 *       content:
 *         application/json:
 *           description: A valid JSON object
 *           schema:
 *             type: object
 *             properties:
 *               configurationVersionHash:
 *                 type: string 
 *                 description: Configuration version hash
 *               content:
 *                 type: object
 *                 description: Configuration Content
 *             additionalProperties: false
 *           example: { "configurationVersionHash": "0123456789abcdef0123456789abcdef01234567", "content": { "key": "value" } }
 *     responses:
 *       200:
 *         description: Ok. Configuration has been saved
 *       401:
 *         description: Unauthorized. Probably missing or invalid JWT token
 *       404:
 *         description: Not found. Configuration cannot be found
 *       500:
 *         description: Internal Server Error. Something went wrong on the server side
 */
export async function POST(
  req: NextRequest,
  { params }: { params: RouteParams }
) {
  const token = await getJWT(req);

  if (!token) {
    return new NextResponse(null, { status: 401 });
  }

  let postBodyBinding: ApiPostBody;
  try {
    const content = await req.json();
    postBodyBinding = plainToInstance(ApiPostBody, content);
    const errors = await validate(postBodyBinding);
    if (errors.length > 0) {
      throw new Error();
    }
  }
  catch (e) {
    return new NextResponse(null, { status: 400 });
  }

  const db = await getDatabase();
  const schemaCollection = db.collection('schemabindings');

  const result = await schemaCollection.findOne({
    configurationId: params.configurationId,
  });

  if (!result) {
    return new NextResponse(null, { status: 404 });
  }

  const binding = plainToInstance(SchemaBindingMongoContent, result);
  const errors = await validate(binding);
  if (errors.length > 0) {
    return new NextResponse(null, { status: 500 });
  }

  binding.url = binding.url.replace('{hash}', postBodyBinding.configurationVersionHash);

  const res = await fetch(binding.url, { cache: 'force-cache' });
  if (!res.ok) {
    return new NextResponse(null, { status: 500 });
  }

  let schema: { [key: string]: any };
  try {
    schema = await res.json();
  }
  catch (e) {
    return new NextResponse(null, { status: 500 });
  }

  const validator = new Validator();
  const isValidSchema = validator.validate(postBodyBinding.content, schema);

  if (isValidSchema.errors.length > 0) {
    return new NextResponse(null, { status: 400 });
  }

  const configurationsCollection = db.collection('configurations');
  const { modifiedCount } = await configurationsCollection.replaceOne(
    {
      vehicleId: params.vehicleId,
      deviceId: params.deviceId,
      configurationId: params.configurationId,
    },
    {
      vehicleId: params.vehicleId,
      deviceId: params.deviceId,
      configurationId: params.configurationId,
      configurationVersionHash: postBodyBinding.configurationVersionHash,
      content: postBodyBinding.content,
      updatedBy: token.email,
      lastUpdate: new Date().toUTCString(),
    },
    { upsert: false }
  ); 

  // If replaceOne() returns acknowledged = false, it means that the configuration has not been found
  if (modifiedCount === 0) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(null, { status: 200 });
}
