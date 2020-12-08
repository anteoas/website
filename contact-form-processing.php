<?php

$errors = [];
$errorMessage = '';

if (!empty($_POST)) {
    $product = $_POST['product'];
    $name = $_POST['name'];
    $email = $_POST['email'];
    $phone = $_POST['phone'];
    $message = $_POST['message'];

    if (empty($name)) {
        $errors[] = 'Name is empty';
    }

    if (empty($email)) {
        $errors[] = 'Email is empty';
    } else if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Email is invalid';
    }

    if (empty($phone)) {
        $errors[] = 'Phone is empty';
    }

    if (empty($message)) {
        $errors[] = 'Message is empty';
    }


    if (!empty($errors)) {
        $allErrors = join('<br/>', $errors);
        $errorMessage = "<p style='color: red;'>{$allErrors}</p>";
    } else {
        $to      = 'post@anteo.no';
        $subject = 'Kundekontakt ' . $product;
        $message = "\n\tNavn : $name.\n".
                    "\tProdukt : $product.\n".    
                    "\tEpost : $email.\n".
                    "\tTelefon : $phone.\n".
                    "\tMelding : $message.\n\n";
        $headers = array(
            'From' => 'alert@anteo.no',
            'Reply-To' => $email
        );

        mail($to, $subject, $message, $headers);    

        header("Location: index.html");
    }
}

?>