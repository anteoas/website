<?php

$errors = array();
$errorMessage = '';

if (!empty($_POST)) {
    $product = $_POST['product'];
    $name = $_POST['name'];
    $email = $_POST['email'];
    $phone = $_POST['phone'];
    $message = $_POST['message'];

    if (empty($name)) {
        array_push($errors, 'Name is empty');
    }

    if (empty($email)) {
        array_push($errors, 'Email is empty');
    } else if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        array_push($errors, 'Email is invalid');
    }

    if (empty($phone)) {
        array_push($errors, 'Phone is empty');
    }

    if (empty($message)) {
        array_push($errors, 'Message is empty');
    }


    if (!empty($errors)) {
        $allErrors = join('<br/>', $errors);
        $errorMessage = "<p style='color: red;'>{$allErrors}</p>";
        echo $errorMessage;
        header( "Refresh:10; url=https://anteo.no/", true, 303);
    } else {
        $to      = 'post@anteo.no';
        $subject = 'Kundekontakt ' . $product;
        $message = "\n\tNavn : $name.\n".
                    "\tProdukt : $product.\n".    
                    "\tEpost : $email.\n".
                    "\tTelefon : $phone.\n".
                    "\tMelding : $message.\n\n";
        $headers = 'From: alert@anteo.no' . "\r\n" .
                    'Reply-To: ' . $email . "\r\n";

        mail($to, $subject, $message, $headers);    

        header("Location: " . $_SERVER['HTTP_REFERER']);
    }
}

?>