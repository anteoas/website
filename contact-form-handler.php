<?php

    $name =$_POST['name'];
    $product =$_POST['product'];
    $visitor_email =$_POST['email'];
    $visitor_phone =$_POST['phone'];
    $message =$_POST['message'];

    $email_from = 'post@anteo.no';

    $email_subject = 'Kundekontakt';

    $email_body = "User Name: $name.\n".
                    "Produkt: $product.\n".    
                        "User Email: $visitor_email.\n".
                            "User phone: $visitor_phone.\n".
                                "User Messsage: $message.\n";
   
    $to = "post@anteo.no";

    $headers = "from: $email_from \r\n";

    $headers .= "reply-to: $visitor_email";

    mail($to,$email_subject,$product,$email_body, $headers);
    header("Location: index.html");
?>
