<?php
require 'vendor/autoload.php';

function getGPTResponse($query)
{
    $client = OpenAI::client(OPENAI_KEY);
    $data = $client->chat()->create([
        'model' => 'gpt-3.5-turbo',
        'messages' => [[
            'role' => 'user',
            'content' => "Limit your response to 100 characters for this query: $query",
        ]],
    ]);

    return $data['choices'][0]['message']['content'];
}

function getGPTImageResponse($query = "What's in this image? ")
{
    $base64Image = encodeImage(SAVE_IMAGE_PATH);
    $client = OpenAI::client(OPENAI_KEY);
    $data = $client->chat()->create([
        'model'      => 'gpt-4-vision-preview',
        'messages'   => [
            [
                'role'    => 'user',
                'content' => [
                    [
                        'type' => 'text',
                        'text' => "$query, limit your response to 100 characters or less."
                    ],
                    [
                        'type' => 'image_url',
                        'image_url' => "data:image/jpeg;base64,$base64Image"
                    ],
                ],
            ]
        ],
        'max_tokens' => 200,
    ]);

    return $data['choices'][0]['message']['content'];
}

function sendWhatsappResponse($response)
{
    $curl = curl_init();
    curl_setopt_array($curl, array(
        CURLOPT_URL => 'https://graph.facebook.com/v19.0/' . WHATSAPP_SENDER_ID . '/messages',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_POSTFIELDS => '{"messaging_product": "whatsapp", "to": "' . WHATSAPP_INCOMING_PHONE_NUMBER . '","text": {"body" : "' . $response . '"}}',
        CURLOPT_HTTPHEADER => array(
            'Authorization: Bearer ' . WHATSAPP_TOKEN,
            'Content-Type: application/json'
        ),
    ));

    $response = curl_exec($curl);
    curl_close($curl);
}

function getMediaLink($mediaID)
{
    $curl = curl_init();
    curl_setopt_array($curl, array(
        CURLOPT_URL => 'https://graph.facebook.com/v19.0/' . $mediaID,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'GET',
        CURLOPT_HTTPHEADER => array(
            'Authorization: Bearer ' . WHATSAPP_TOKEN,
        ),
    ));

    $response = curl_exec($curl);
    curl_close($curl);

    return json_decode($response)->url;
}

function downloadMediaLink($url)
{
    $curl = curl_init();
    $fp = fopen(SAVE_IMAGE_PATH, 'w+');
    curl_setopt_array($curl, array(
        CURLOPT_URL => $url,
        CURLOPT_FILE => $fp,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_USERAGENT => 'PostmanRuntime/7.36.0',
        CURLOPT_TIMEOUT => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'GET',
        CURLOPT_HTTPHEADER => array(
            'Authorization: Bearer ' . WHATSAPP_TOKEN
        ),
    ));

    curl_exec($curl);
    curl_close($curl);
    fclose($fp);
}

function encodeImage($imagePath): string
{
    $imageContent = file_get_contents($imagePath);
    return base64_encode($imageContent);
}

// Configuration Constants
define("WHATSAPP_TOKEN", "YOUR_WHATSAPP_TOKEN"); // Get this from Facebook Developer Console
define("WHATSAPP_SENDER_ID", "YOUR_WHATSAPP_PHONE_NUMBER_ID"); // Get this from debug.txt
define("WHATSAPP_INCOMING_PHONE_NUMBER", "+1234567890"); // Your WhatsApp number
define("OPENAI_KEY", "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");
define("SAVE_IMAGE_PATH", "query_image.jpg");

// Webhook verification
if (isset($_GET['hub_challenge'])) {
    echo ($_GET['hub_challenge']);
} else {
    $json = file_get_contents('php://input');

    // Uncomment these lines for debugging
    // file_put_contents("debug.txt", $json);
    // die();

    $json = json_decode($json);

    $message = $json->entry[0]->changes[0]->value->messages[0];
    if ($message->from == WHATSAPP_INCOMING_PHONE_NUMBER) {
        if ($message->type == "text") {
            $query = $message->text->body;
            if (file_exists(SAVE_IMAGE_PATH)) {
                $response = getGPTImageResponse($query);
                unlink(SAVE_IMAGE_PATH);
            } else {
                $response = getGPTResponse($query);
            }
            sendWhatsappResponse($response);
        } else if ($message->type == "image") {
            $mediaLink = getMediaLink($message->image->id);
            downloadMediaLink($mediaLink);
        }
    }
}
